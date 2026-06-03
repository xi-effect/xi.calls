type DemoChromePropsT = {
  children: React.ReactNode;
};

/** Оболочка демо-страницы на весь viewport (без встроенной навигации) */
export const DemoChrome = ({ children }: DemoChromePropsT) => {
  return <div className="bg-gray-5 h-dvh min-h-0 overflow-hidden">{children}</div>;
};
