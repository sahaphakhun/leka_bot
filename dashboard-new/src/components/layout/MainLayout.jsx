const MainLayout = ({ children }) => {
  return (
    <main className="flex-1 lg:ml-[240px] ml-0 overflow-auto">{children}</main>
  );
};

export default MainLayout;
