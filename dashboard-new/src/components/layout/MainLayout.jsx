const MainLayout = ({ children }) => {
  return (
    <main className="flex-1 lg:ml-[240px] ml-0 overflow-auto w-full max-w-full">
      <div className="pt-[calc(env(safe-area-inset-top)+4rem)] lg:pt-0 px-2 sm:px-4 lg:px-6 w-full max-w-full">
        {children}
      </div>
    </main>
  );
};

export default MainLayout;
