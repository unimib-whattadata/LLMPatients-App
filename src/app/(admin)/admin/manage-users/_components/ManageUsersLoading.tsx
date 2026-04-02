"use client";

import { Skeleton } from "~/components/ui/skeleton";

export function ManageUsersLoading() {
  return (
    <div className="dashboard-panel-stack">
      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <Skeleton variant="text" className="h-8 w-64" />
            <Skeleton variant="text" className="mt-2 h-4 w-96" />
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <Skeleton variant="text" className="h-6 w-48" />
            <Skeleton variant="text" className="mt-2 h-4 w-72" />
          </div>
        </div>
        <div className="dashboard-metric-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="dashboard-metric-card">
              <Skeleton variant="text" className="mx-auto mb-2 h-8 w-12" />
              <Skeleton variant="text" className="mx-auto h-4 w-20" />
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <Skeleton variant="text" className="h-6 w-48" />
            <Skeleton variant="text" className="mt-2 h-4 w-72" />
          </div>
          <Skeleton variant="button" className="h-10 w-32" />
        </div>

        <div className="dashboard-panel">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <Skeleton variant="text" className="h-10 flex-1" />
            <Skeleton variant="text" className="h-10 w-32" />
          </div>

          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>
                    <Skeleton variant="text" className="h-4 w-16" />
                  </th>
                  <th>
                    <Skeleton variant="text" className="h-4 w-16" />
                  </th>
                  <th>
                    <Skeleton variant="text" className="h-4 w-16" />
                  </th>
                  <th>
                    <Skeleton variant="text" className="h-4 w-16" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td>
                      <Skeleton variant="text" className="h-4 w-24" />
                    </td>
                    <td>
                      <Skeleton variant="text" className="h-4 w-32" />
                    </td>
                    <td>
                      <Skeleton
                        variant="text"
                        className="h-6 w-16 rounded-full"
                      />
                    </td>
                    <td>
                      <div className="flex space-x-2">
                        <Skeleton variant="button" className="h-8 w-16" />
                        <Skeleton variant="button" className="h-8 w-20" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
