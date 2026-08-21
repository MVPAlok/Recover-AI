import React from 'react';
import { Outlet } from 'react-router-dom';

export const RootLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 text-slate-100 p-6">
      <main className="w-full max-w-2xl text-center">
        <Outlet />
      </main>
    </div>
  );
};
