const MainLayout = ({ children }) => {
  return (
    <main className="flex-1 ml-[190px] overflow-auto">
      {children}
    </main>
  );
};

export default MainLayout;

