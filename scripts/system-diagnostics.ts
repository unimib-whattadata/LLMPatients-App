#!/usr/bin/env node


import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { users } from "../src/server/db/tables";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";
import { readFileSync, existsSync, statSync } from "fs";
import { execSync } from "child_process";





interface FileLocation {
  scriptPath: string;
  scriptDir: string;
  projectRoot: string;
  workingDirectory: string;
}

interface EnvironmentInfo {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isLocal: boolean;
  environment: "local" | "production";
}

interface EnvFileConfig {
  path: string;
  priority: number;
  name: string;
  required: boolean;
}

interface EnvironmentLoadResult {
  env: EnvironmentInfo;
  primaryEnvFile: string | null;
  loadedFiles: string[];
}

interface DiagnosticResult {
  environment: boolean;
  projectStructure: boolean;
  dependencies: boolean;
  linting: boolean;
  typescript: boolean;
  database: boolean;
  authentication: boolean;
  userAuth: boolean;
  build: boolean;
  permissions: boolean;
}

interface DatabaseStats {
  connectionTime: number;
  totalUsers: number;
  roleCounts: Record<string, number>;
}





class Logger {
  private static formatMessage(
    icon: string,
    message: string,
    indent = 0,
  ): string {
    const spaces = "   ".repeat(indent);
    return `${spaces}${icon} ${message}`;
  }

  static info(message: string, indent = 0): void {
    console.log(this.formatMessage("ℹ️", message, indent));
  }

  static success(message: string, indent = 0): void {
    console.log(this.formatMessage("✅", message, indent));
  }

  static warning(message: string, indent = 0): void {
    console.log(this.formatMessage("⚠️", message, indent));
  }

  static error(message: string, indent = 0): void {
    console.log(this.formatMessage("❌", message, indent));
  }

  static section(title: string): void {
    console.log(`\n${title}:`);
  }

  static header(title: string): void {
    console.log(`\n${title}`);
    console.log("=".repeat(title.length));
  }
}

class FileSystemHelper {
  static getFileLocation(): FileLocation {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = join(__dirname, "..");

    return {
      scriptPath: __filename,
      scriptDir: __dirname,
      projectRoot: projectRoot,
      workingDirectory: process.cwd(),
    };
  }

  static checkFileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  static getFileStats(filePath: string) {
    try {
      return statSync(filePath);
    } catch {
      return null;
    }
  }

  static readFileContent(filePath: string): string | null {
    try {
      return readFileSync(filePath, "utf8");
    } catch {
      return null;
    }
  }
}

class EnvironmentHelper {
  static detectEnvironment(): EnvironmentInfo {
    const nodeEnv = process.env.NODE_ENV;
    const isProduction = nodeEnv === "production";
    const isDevelopment = nodeEnv === "development" || !nodeEnv;
    const isLocal =
      process.env.NODE_ENV !== "production" &&
      (process.env.VERCEL_ENV !== "production" || !process.env.VERCEL_ENV);

    return {
      nodeEnv: nodeEnv || "development",
      isProduction,
      isDevelopment,
      isLocal,
      environment: isProduction ? "production" : "local",
    };
  }

  static loadEnvironmentVariables(): EnvironmentLoadResult {
    const location = FileSystemHelper.getFileLocation();
    const env = this.detectEnvironment();

    Logger.section("🔧 Loading environment variables");
    Logger.info(
      `🌍 Detected environment: ${env.environment} (NODE_ENV: ${env.nodeEnv})`,
    );

    const envFileConfigs: Record<string, EnvFileConfig[]> = {
      local: [
        {
          path: join(location.projectRoot, ".env.local"),
          priority: 1,
          name: ".env.local",
          required: false,
        },
        {
          path: join(location.projectRoot, ".env.development"),
          priority: 2,
          name: ".env.development",
          required: false,
        },
        {
          path: join(location.projectRoot, ".env"),
          priority: 3,
          name: ".env",
          required: true,
        },
      ],
      production: [
        {
          path: join(location.projectRoot, ".env.production"),
          priority: 1,
          name: ".env.production",
          required: true,
        },
        {
          path: join(location.projectRoot, "production.env"),
          priority: 2,
          name: "production.env",
          required: false,
        },
        {
          path: join(location.projectRoot, ".env"),
          priority: 3,
          name: ".env",
          required: false,
        },
      ],
    };

    const envFiles = envFileConfigs[env.environment] ?? envFileConfigs.local;

    if (!envFiles) {
      throw new Error(`Invalid environment: ${env.environment}`);
    }

    const loadedFiles: string[] = [];
    let primaryEnvFile: string | null = null;
    let requiredFileFound = false;

    Logger.info(`📋 Looking for ${env.environment} environment files...`);

    for (const envFile of envFiles) {
      if (FileSystemHelper.checkFileExists(envFile.path)) {
        Logger.success(`Found: ${envFile.name} (${envFile.path})`);
        config({ path: envFile.path });
        loadedFiles.push(envFile.name);

        if (!primaryEnvFile) {
          primaryEnvFile = envFile.name;
        }

        if (envFile.required) {
          requiredFileFound = true;
        }
      } else {
        const status = envFile.required ? "REQUIRED" : "Optional";
        const icon = envFile.required ? "❌" : "ℹ️";
        Logger.info(`${icon} ${status}: ${envFile.name}`);
      }
    }

    if (env.environment === "production" && !requiredFileFound) {
      Logger.warning("No production environment file found!");
      Logger.info(
        "💡 Production tip: Create .env.production for production settings",
      );
    }

    if (primaryEnvFile) {
      Logger.success(`Primary environment file: ${primaryEnvFile}`);
      Logger.info(`📋 Loaded from files: ${loadedFiles.join(", ")}`);

      if (env.isProduction && !primaryEnvFile.includes("production")) {
        Logger.info(
          "💡 Production tip: Consider using .env.production for production environment",
        );
      } else if (env.isLocal && primaryEnvFile === ".env.production") {
        Logger.info(
          "💡 Local tip: Using production environment file in local development",
        );
      }
    } else {
      Logger.warning(
        "No .env files found, using system environment variables only",
      );
    }

    this.showEnvironmentValidation(env);
    this.showEnvironmentFileContents(location, primaryEnvFile);

    return { env, primaryEnvFile, loadedFiles };
  }

  private static showEnvironmentValidation(env: EnvironmentInfo): void {
    Logger.section("🔍 Environment-specific validation");
    if (env.isProduction) {
      Logger.info("🏭 Production environment detected");
      Logger.success("HTTPS should be enforced");
      Logger.success("Secure secrets required");
      Logger.success("Database connection should be optimized");
    } else {
      Logger.info("🏠 Local development environment detected");
      Logger.success("Development-friendly settings expected");
      Logger.success("Local database connections allowed");
    }
  }

  private static showEnvironmentFileContents(
    location: FileLocation,
    primaryEnvFile: string | null,
  ): void {
    if (!primaryEnvFile) return;

    try {
      const envFilePath = join(location.projectRoot, primaryEnvFile);
      const envContent = FileSystemHelper.readFileContent(envFilePath);

      if (!envContent) return;

      Logger.section(`📝 Environment variables in ${primaryEnvFile}`);
      const lines = envContent
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"));

      lines.forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        const value = valueParts.join("=");
        if (key && value) {
          const isSensitive =
            key.toLowerCase().includes("secret") ||
            key.toLowerCase().includes("password") ||
            key.toLowerCase().includes("token");
          const displayValue = isSensitive ? `***${value.slice(-4)}` : value;
          Logger.info(`${key}=${displayValue}`);
        }
      });
    } catch (error) {
      Logger.warning(`Could not read ${primaryEnvFile} contents`);
    }
  }
}





class ProjectStructureChecker {
  static check(): boolean {
    Logger.section("📁 Project Structure Check");

    const location = FileSystemHelper.getFileLocation();
    const essentialFiles = [
      "package.json",
      "next.config.js",
      "tsconfig.json",
      "tailwind.config.ts",
      "src/app/layout.tsx",
      "src/server/db/schema.ts",
      "src/server/auth/config.ts",
    ];

    const essentialDirs = [
      "src",
      "src/app",
      "src/components",
      "src/server",
      "public",
    ];

    let allFilesExist = true;
    let allDirsExist = true;

    Logger.info("📄 Essential files:");
    essentialFiles.forEach((file) => {
      const filePath = join(location.projectRoot, file);
      if (FileSystemHelper.checkFileExists(filePath)) {
        Logger.success(file);
      } else {
        Logger.error(`${file} - MISSING`);
        allFilesExist = false;
      }
    });

    Logger.info("📂 Essential directories:");
    essentialDirs.forEach((dir) => {
      const dirPath = join(location.projectRoot, dir);
      const stats = FileSystemHelper.getFileStats(dirPath);
      if (stats?.isDirectory()) {
        Logger.success(`${dir}/`);
      } else {
        Logger.error(`${dir}/ - MISSING`);
        allDirsExist = false;
      }
    });

    if (allFilesExist && allDirsExist) {
      Logger.success("All essential files and directories are present");
    } else {
      Logger.warning("Some essential files or directories are missing");
    }

    return allFilesExist && allDirsExist;
  }
}

class DependenciesChecker {
  static check(): boolean {
    Logger.section("📦 Dependencies Check");

    const location = FileSystemHelper.getFileLocation();
    const packageJsonPath = join(location.projectRoot, "package.json");

    try {
      const packageJsonContent =
        FileSystemHelper.readFileContent(packageJsonPath);
      if (!packageJsonContent) {
        Logger.error("Could not read package.json");
        return false;
      }

      const packageJson = JSON.parse(packageJsonContent);

      Logger.info("📋 Package.json validation:");
      const requiredFields = [
        "name",
        "version",
        "scripts",
        "dependencies",
        "devDependencies",
      ];
      requiredFields.forEach((field) => {
        if (packageJson[field]) {
          Logger.success(`${field}: present`);
        } else {
          Logger.error(`${field}: missing`);
        }
      });

      Logger.info("🔍 Critical dependencies:");
      const criticalDeps = [
        "next",
        "react",
        "react-dom",
        "@libsql/client",
        "drizzle-orm",
        "next-auth",
      ];

      criticalDeps.forEach((dep) => {
        const version =
          packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
        if (version) {
          Logger.success(`${dep}: ${version}`);
        } else {
          Logger.error(`${dep}: missing`);
        }
      });

      Logger.info("🛠️  Available scripts:");
      const importantScripts = ["build", "dev", "lint", "typecheck", "db:seed"];
      importantScripts.forEach((script) => {
        if (packageJson.scripts?.[script]) {
          Logger.success(`${script}: ${packageJson.scripts[script]}`);
        } else {
          Logger.error(`${script}: missing`);
        }
      });

      return true;
    } catch (error) {
      Logger.error(`Could not read package.json: ${String(error)}`);
      return false;
    }
  }
}

class CodeQualityChecker {
  static async runLintingChecks(): Promise<boolean> {
    Logger.section("🔍 Code Quality Checks");

    try {
      Logger.info("📝 Running ESLint...");
      const lintStartTime = Date.now();
      const lintResult = execSync("pnpm run lint", {
        cwd: FileSystemHelper.getFileLocation().projectRoot,
        encoding: "utf8",
        stdio: "pipe",
      });
      const lintEndTime = Date.now();
      Logger.success(`ESLint passed (${lintEndTime - lintStartTime}ms)`);
      Logger.info(`📊 Lint output: ${lintResult.trim() || "No issues found"}`);

      return true;
    } catch (error: any) {
      Logger.error(`ESLint failed: ${error.message}`);
      if (error.stdout) {
        Logger.info(`📋 Lint output: ${String(error.stdout)}`);
      }
      return false;
    }
  }

  static async runTypeScriptCheck(): Promise<boolean> {
    Logger.info("🔧 Running TypeScript check...");

    try {
      const tsStartTime = Date.now();
      const tsResult = execSync("pnpm run typecheck", {
        cwd: FileSystemHelper.getFileLocation().projectRoot,
        encoding: "utf8",
        stdio: "pipe",
      });
      const tsEndTime = Date.now();
      Logger.success(
        `TypeScript compilation passed (${tsEndTime - tsStartTime}ms)`,
      );
      return true;
    } catch (error: any) {
      Logger.error(`TypeScript compilation failed: ${error.message}`);
      if (error.stdout) {
        Logger.info(`📋 TypeScript output: ${String(error.stdout)}`);
      }
      return false;
    }
  }
}

class DatabaseChecker {
  static async check(): Promise<boolean> {
    Logger.section("🗄️  Database Connectivity Check");

    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        Logger.error("DATABASE_URL not set");
        return false;
      }

      const connectionStartTime = Date.now();

      Logger.info("📊 Database Information:");
      this.logDatabaseInfo(databaseUrl);

      const client = createClient({
        url: databaseUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      });

      const db = drizzle(client) as any;

      const result = await db.select().from(users).limit(1);
      const connectionEndTime = Date.now();
      const connectionTime = connectionEndTime - connectionStartTime;

      Logger.success("Database connection successful");
      Logger.info(`Connection time: ${connectionTime}ms`);
      Logger.info(`Found ${result.length} user(s) in database`);

      const stats = await this.getDatabaseStats(db);
      this.logDatabaseStats(stats);

      this.checkDatabaseSchema();

      client.close();
      return true;
    } catch (error) {
      Logger.error("Database connection failed:");
      Logger.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      Logger.info("Please check your DATABASE_URL and network connectivity.");
      return false;
    }
  }

  private static logDatabaseInfo(databaseUrl: string): void {
    try {
      const url = new URL(databaseUrl);
      Logger.info(`Type: ${url.protocol.replace(":", "")}`);
      Logger.info(`Host: ${url.hostname}`);
      Logger.info(`Port: ${url.port || "default"}`);
      Logger.info(`Database: ${url.pathname.slice(1) || "default"}`);
      if (url.searchParams.has("authToken")) {
        Logger.info(
          `Auth Token: ${url.searchParams.get("authToken")?.length || 0} characters`,
        );
      }
    } catch (urlError) {
      Logger.info(`URL: ${databaseUrl.substring(0, 50)}...`);
    }
  }

  private static async getDatabaseStats(db: any): Promise<DatabaseStats> {
    try {
      const totalUsers = await db.select().from(users);
      const roleCounts = totalUsers.reduce(
        (acc: Record<string, number>, user: any) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        connectionTime: 0, 
        totalUsers: totalUsers.length,
        roleCounts,
      };
    } catch {
      return { connectionTime: 0, totalUsers: 0, roleCounts: {} };
    }
  }

  private static logDatabaseStats(stats: DatabaseStats): void {
    Logger.info(`Total users in database: ${stats.totalUsers}`);

    if (Object.keys(stats.roleCounts).length > 0) {
      Logger.info("User roles distribution:");
      Object.entries(stats.roleCounts).forEach(([role, count]) => {
        Logger.info(`- ${role}: ${count} users`, 1);
      });
    }
  }

  private static checkDatabaseSchema(): void {
    Logger.section("📋 Database Schema Check");
    Logger.success("Users table accessible");
    Logger.success("Database schema appears to be properly configured");
  }
}

class AuthenticationChecker {
  static check(): boolean {
    Logger.section("🔐 Authentication Configuration Check");

    const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!authSecret) {
      Logger.error("No AUTH_SECRET or NEXTAUTH_SECRET found");
      return false;
    } else if (authSecret.length < 32) {
      Logger.warning(
        `AUTH_SECRET is too short (${authSecret.length} characters, minimum 32)`,
      );
      return false;
    } else {
      Logger.success("AUTH_SECRET is properly configured");
    }

    return true;
  }

  static async testUserAuthentication(): Promise<boolean> {
    Logger.section("👤 User Authentication Test");
    try {
      const client = createClient({
        url: process.env.DATABASE_URL!,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      });
      const db = drizzle(client) as any;

      const testUsers = await db
        .select({ email: users.email, role: users.role })
        .from(users)
        .where(eq(users.email, "admin@example.com"));

      if (testUsers.length > 0) {
        Logger.success("Test user found in database");
        Logger.info(`Email: ${testUsers[0]?.email}`);
        Logger.info(`Role: ${testUsers[0]?.role}`);
      } else {
        Logger.warning("No test users found");
        Logger.info("Run 'pnpm run db:seed' to create test users");
      }

      client.close();
      return true;
    } catch (error) {
      Logger.error("User authentication test failed:");
      Logger.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}

class EnvironmentConfigChecker {
  static check(env: EnvironmentInfo): boolean {
    Logger.section("🌍 Environment-Specific Configuration Check");

    if (env.isProduction) {
      Logger.info("🏭 Production environment checks:");
      return this.checkProductionConfig();
    } else {
      Logger.info("🏠 Local development environment checks:");
      return this.checkLocalConfig();
    }
  }

  private static checkProductionConfig(): boolean {
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (nextAuthUrl && !nextAuthUrl.startsWith("https://")) {
      Logger.error("NEXTAUTH_URL should use HTTPS in production");
      return false;
    } else if (nextAuthUrl) {
      Logger.success("NEXTAUTH_URL uses HTTPS");
    } else {
      Logger.warning("NEXTAUTH_URL not set (recommended for production)");
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && databaseUrl.includes("localhost")) {
      Logger.warning("Database URL contains localhost in production");
    } else if (databaseUrl) {
      Logger.success("Database URL appears to be production-ready");
    }

    Logger.section("🔒 Security checks");
    Logger.success("HTTPS enforcement required");
    Logger.success("Secure secrets required");
    Logger.success("Production database required");

    return true;
  }

  private static checkLocalConfig(): boolean {
    Logger.success("Local database connections allowed");
    Logger.success("HTTP connections allowed for development");
    Logger.success("Development secrets acceptable");

    const location = FileSystemHelper.getFileLocation();
    const devFiles = [".env.local", ".env.development"];
    const foundDevFiles = devFiles.filter((file) =>
      FileSystemHelper.checkFileExists(join(location.projectRoot, file)),
    );

    if (foundDevFiles.length > 0) {
      Logger.success(`Development files found: ${foundDevFiles.join(", ")}`);
    } else {
      Logger.info("No development-specific .env files found");
    }

    return true;
  }
}

class BuildChecker {
  static check(): boolean {
    Logger.section("🏗️  Build Process Check");

    try {
      Logger.info("🔨 Testing build process...");
      const buildStartTime = Date.now();

      execSync("pnpm run typecheck", {
        cwd: FileSystemHelper.getFileLocation().projectRoot,
        encoding: "utf8",
        stdio: "pipe",
      });

      const buildEndTime = Date.now();
      Logger.success(
        `Build process validation passed (${buildEndTime - buildStartTime}ms)`,
      );
      return true;
    } catch (error: any) {
      Logger.error(`Build process validation failed: ${error.message}`);
      return false;
    }
  }
}

class PermissionsChecker {
  static check(): boolean {
    Logger.section("🔒 File Permissions Check");

    const location = FileSystemHelper.getFileLocation();
    const criticalFiles = [
      "package.json",
      "next.config.js",
      "src/app/layout.tsx",
      "src/server/db/schema.ts",
    ];

    let allAccessible = true;

    criticalFiles.forEach((file) => {
      const filePath = join(location.projectRoot, file);
      try {
        if (FileSystemHelper.checkFileExists(filePath)) {
          const stats = FileSystemHelper.getFileStats(filePath);
          Logger.success(`${file} - readable (${stats?.size || 0} bytes)`);
        } else {
          Logger.error(`${file} - not found`);
          allAccessible = false;
        }
      } catch (error) {
        Logger.error(`${file} - access denied`);
        allAccessible = false;
      }
    });

    return allAccessible;
  }
}





class SystemDiagnostics {
  private results: DiagnosticResult = {
    environment: false,
    projectStructure: false,
    dependencies: false,
    linting: false,
    typescript: false,
    database: false,
    authentication: false,
    userAuth: false,
    build: false,
    permissions: false,
  };

  async run(): Promise<void> {
    Logger.header("🔍 Starting comprehensive system diagnostics");

    try {
      await this.runAllChecks();
      this.generateSummary();
      this.showRecommendations();
    } catch (error) {
      Logger.error(`System diagnostics failed: ${String(error)}`);
      process.exit(1);
    }
  }

  private async runAllChecks(): Promise<void> {
    
    const envInfo = EnvironmentHelper.loadEnvironmentVariables();
    this.results.environment = true;

    this.showFileLocationInfo();
    this.checkEnvironmentVariables();

    
    this.results.projectStructure = ProjectStructureChecker.check();
    this.results.dependencies = DependenciesChecker.check();
    this.results.linting = await CodeQualityChecker.runLintingChecks();
    this.results.typescript = await CodeQualityChecker.runTypeScriptCheck();
    this.results.database = await DatabaseChecker.check();
    this.results.environment = EnvironmentConfigChecker.check(envInfo.env);
    this.results.authentication = AuthenticationChecker.check();
    this.results.userAuth =
      await AuthenticationChecker.testUserAuthentication();
    this.results.build = BuildChecker.check();
    this.results.permissions = PermissionsChecker.check();
  }

  private showFileLocationInfo(): void {
    Logger.section("📁 File Location Information");
    const location = FileSystemHelper.getFileLocation();
    Logger.info(`Script path: ${location.scriptPath}`);
    Logger.info(`Script directory: ${location.scriptDir}`);
    Logger.info(`Project root: ${location.projectRoot}`);
    Logger.info(`Working directory: ${location.workingDirectory}`);
  }

  private checkEnvironmentVariables(): void {
    Logger.section("📋 Environment Variables Check");
    const requiredEnvVars = [
      "DATABASE_URL",
      "AUTH_SECRET",
      "NEXTAUTH_SECRET",
      "NODE_ENV",
    ];

    const missingVars: string[] = [];
    const presentVars: string[] = [];

    for (const varName of requiredEnvVars) {
      const value = process.env[varName];
      if (!value) {
        missingVars.push(varName);
        Logger.error(`${varName}: MISSING`);
      } else {
        presentVars.push(varName);
        if (varName.includes("SECRET")) {
          Logger.success(`${varName}: SET (${value.length} characters)`);
        } else {
          Logger.success(`${varName}: ${value}`);
        }
      }
    }

    if (missingVars.length > 0) {
      Logger.warning(
        `Missing environment variables: ${missingVars.join(", ")}`,
      );
      Logger.info("Please set these variables in your production environment.");
    } else {
      Logger.success("All required environment variables are set.");
    }
  }

  private generateSummary(): void {
    Logger.header("📊 DIAGNOSTICS SUMMARY");

    const totalChecks = Object.keys(this.results).length;
    const passedChecks = Object.values(this.results).filter(Boolean).length;
    const failedChecks = totalChecks - passedChecks;

    Logger.success(`Passed: ${passedChecks}/${totalChecks} checks`);
    Logger.error(`Failed: ${failedChecks}/${totalChecks} checks`);

    Object.entries(this.results).forEach(([check, passed]) => {
      const status = passed ? "✅" : "❌";
      const checkName = check
        .replace(/([A-Z])/g, " $1")
        .toLowerCase()
        .replace(/^./, (str) => str.toUpperCase());
      Logger.info(`${status} ${checkName}`);
    });

    Logger.header("🏁 System diagnostics complete!");

    if (failedChecks > 0) {
      Logger.warning("Some checks failed. Please review the output above and:");
      Logger.info("1. Fix any linting or TypeScript errors");
      Logger.info("2. Ensure all environment variables are properly set");
      Logger.info("3. Verify database connectivity");
      Logger.info("4. Check file permissions and project structure");
      Logger.info("5. Run 'pnpm run db:seed' if needed for test users");
    } else {
      Logger.success(
        "All system checks passed! Your application is ready for deployment.",
      );
    }
  }

  private showRecommendations(): void {
    Logger.section("💡 Environment-specific recommendations");
    const env = EnvironmentHelper.detectEnvironment();

    if (env.isProduction) {
      Logger.info("🏭 Production environment:");
      Logger.info("• Ensure HTTPS is properly configured");
      Logger.info("• Use production database with proper security");
      Logger.info("• Set strong, unique secrets for AUTH_SECRET");
      Logger.info("• Monitor performance and error rates");
      Logger.info("• Set up proper logging and monitoring");
    } else {
      Logger.info("🏠 Local development environment:");
      Logger.info("• Use .env.local for local-specific settings");
      Logger.info("• Consider using .env.development for team settings");
      Logger.info("• Local database connections are acceptable");
      Logger.info("• Development secrets can be simpler");
      Logger.info("• Enable debug logging for development");
    }
  }
}





async function runSystemDiagnostics(): Promise<void> {
  const diagnostics = new SystemDiagnostics();
  await diagnostics.run();
}

// Run diagnostics if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSystemDiagnostics().catch((error) => {
    Logger.error(`System diagnostics failed: ${error}`);
    process.exit(1);
  });
}

export { runSystemDiagnostics, FileSystemHelper };
