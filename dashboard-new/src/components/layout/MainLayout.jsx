const MainLayout = ({ children }) => {
  return (
    <main className="flex-1 ml-[240px] overflow-auto">
      {children}
    </main>
  );
};

export default MainLayout;
