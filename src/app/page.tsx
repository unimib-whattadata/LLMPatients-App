import Link from "next/link";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-800 rounded"></div>
                </div>
                <span className="ml-2 text-lg font-medium text-gray-900">ePatient</span>
              </div>
              <nav className="hidden md:flex space-x-8">
                <Link href="#" className="link-secondary hover:text-gray-700">Home</Link>
                <Link href="#" className="link-secondary hover:text-gray-700">Chi siamo</Link>
                <Link href="#" className="link-secondary hover:text-gray-700">Esplora platform</Link>
                <Link href="#" className="link-secondary hover:text-gray-700">News</Link>
              </nav>
              <div>
                <Link
                  href={session ? "/api/auth/signout" : "/login"}
                  className="btn btn-primary btn-md"
                >
                  {session ? "Esci" : "Accedi"}
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative h-96 bg-cover bg-center" style={{
          backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0MDAiIHZpZXdCb3g9IjAgMCAxMjAwIDQwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjNEE1NTY4Ii8+Cjx0ZXh0IHg9IjYwMCIgeT0iMjAwIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SGVhbHRoY2FyZSBJbWFnZTwvdGV4dD4KPC9zdmc+')"
        }}>
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="text-white">
              <h1 className="text-heading-1 mb-4 text-white">Simula. Valuta. Impara.</h1>
              <p className="text-body-lg mb-6 max-w-2xl text-white">
                Esplora scenari medici realistici dove puoi praticare diagnosi e sviluppare
                competenze cliniche in un ambiente sicuro e controllato.
              </p>
              <Link
                href="#"
                className="btn btn-primary btn-lg inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Scopri il progetto
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-gray-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-heading-2 text-center mb-12 text-white">Il tuo percorso formativo, passo dopo passo</h2>
            
            <div className="space-y-16">
              {/* Feature 1 */}
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 mb-8 md:mb-0">
                  <h3 className="text-heading-3 mb-4 text-white">Simulazione realistica</h3>
                  <p className="text-body text-gray-300">
                    Entra in un ambiente virtuale dove puoi interagire
                    con pazienti e situazioni cliniche realistiche.
                    Sviluppa le tue competenze diagnostiche e
                    terapeutiche attraverso simulazioni avanzate che
                    rispecchiano fedelmente la realtà medica.
                  </p>
                </div>
                <div className="md:w-1/2 flex justify-center">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    1
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col md:flex-row-reverse items-center">
                <div className="md:w-1/2 mb-8 md:mb-0">
                  <h3 className="text-heading-3 mb-4 text-white">Valutazione automatica e strutturata</h3>
                  <p className="text-body text-gray-300">
                    Il sistema di valutazione registra ogni
                    azione e decisione, fornendo un feedback
                    immediato e dettagliato.
                  </p>
                </div>
                <div className="md:w-1/2 flex justify-center">
                  <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    2
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 mb-8 md:mb-0">
                  <h3 className="text-heading-3 mb-4 text-white">Report e riflessione guidata</h3>
                  <p className="text-body text-gray-300">
                    Trova le attuali metriche originali e
                    approfondisci i tuoi raggiungimenti.
                  </p>
                </div>
                <div className="md:w-1/2 flex justify-center">
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-bold">
                    3
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link
                href="#"
                className="btn btn-primary btn-lg"
              >
                Inizia subito
              </Link>
            </div>
          </div>
        </section>

        {/* News Section */}
        <section className="py-16 bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-heading-2 text-white">News</h2>
              <Link href="#" className="link-primary hover:text-green-300">
                → Tutte le news
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* News Cards */}
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="bg-gray-700 rounded-lg overflow-hidden">
                  <div className="h-48 bg-orange-400"></div>
                  <div className="p-6">
                    <h3 className="text-body-lg font-semibold mb-2 text-white">Lorem ipsum dolor sit amet</h3>
                    <p className="text-body-sm mb-4 text-gray-300">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                      Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <Link
                      href="#"
                      className="btn btn-primary btn-sm"
                    >
                      Scopri di più
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-heading-2 text-white text-center mb-12">Il nostro team</h2>
            
            <div className="flex justify-center items-center space-x-8">
              <button className="text-white hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="grid grid-cols-4 gap-8">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="text-center">
                    <div className="w-24 h-24 bg-gray-400 rounded-full mx-auto mb-4"></div>
                    <div className="h-2 bg-gray-600 rounded mb-2"></div>
                    <div className="h-2 bg-gray-600 rounded w-3/4 mx-auto"></div>
                  </div>
                ))}
              </div>
              
              <button className="text-white hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <div className="text-center mt-12">
              <Link
                href="#"
                className="btn btn-primary btn-lg"
              >
                Scopri di più
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white">
          {/* Newsletter Section */}
          <div className="bg-gray-700 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <p className="text-body-sm text-white">
                  Vuoi ricevere aggiornamenti sui progetti e ricerche gratuite?
                  <br />
                  Iscriviti alla nostra newsletter.
                </p>
              </div>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Il tuo indirizzo email"
                  className="input-field rounded-r-none"
                />
                <button className="btn btn-primary rounded-l-none">
                  Iscriviti
                </button>
              </div>
            </div>
          </div>

          {/* Main Footer */}
          <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Logo and Info */}
                <div className="col-span-2">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-white rounded"></div>
                    <div className="ml-4">
                      <p className="text-body-sm text-white">
                        Progetto sviluppato in collaborazione con l&apos;Università degli Studi di
                        Milano-Bicocca
                      </p>
                      <p className="text-body-sm text-white">
                        Dipartimento di Informatica, Sistemistica e Comunicazione
                      </p>
                      <p className="text-body-sm text-white">
                        Dipartimento di Medicina e Chirurgia
                      </p>
                    </div>
                  </div>
                </div>

                {/* Collegamenti rapidi */}
                <div>
                  <h3 className="text-body font-semibold mb-4 text-white">Collegamenti rapidi</h3>
                  <ul className="space-y-2 text-body-sm">
                    <li><Link href="#" className="link-secondary hover:text-gray-300">Chi siamo</Link></li>
                    <li><Link href="#" className="link-secondary hover:text-gray-300">News</Link></li>
                    <li><Link href="#" className="link-secondary hover:text-gray-300">Esplora platform</Link></li>
                    <li><Link href="#" className="link-secondary hover:text-gray-300">Contatti</Link></li>
                  </ul>
                </div>

                {/* Contatti */}
                <div>
                  <h3 className="text-body font-semibold mb-4 text-white">Contatti</h3>
                  <div className="space-y-2 text-body-sm text-white">
                    <p>ePatient</p>
                    <p>epatient@email.com</p>
                    <div className="flex space-x-4 mt-4">
                      {/* Social Media Icons */}
                      <Link href="#" className="hover:text-gray-300">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                        </svg>
                      </Link>
                      <Link href="#" className="hover:text-gray-300">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                        </svg>
                      </Link>
                      <Link href="#" className="hover:text-gray-300">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </Link>
                      <Link href="#" className="hover:text-gray-300">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.888-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.357-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom section */}
              <div className="mt-8 pt-8 border-t border-gray-600">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <p className="text-body-sm text-gray-400">
                    © 2024 ePatient. Tutti i diritti riservati.
                  </p>
                  <div className="flex space-x-6 text-body-sm text-gray-400 mt-4 md:mt-0">
                    <Link href="#" className="link-secondary hover:text-gray-300">Privacy Policy</Link>
                    <Link href="#" className="link-secondary hover:text-gray-300">Termini e condizioni</Link>
                    <Link href="#" className="link-secondary hover:text-gray-300">Informazioni cookie</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </HydrateClient>
  );
}
