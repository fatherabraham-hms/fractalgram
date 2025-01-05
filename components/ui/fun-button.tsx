import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";

interface FunButtonProps extends ButtonProps {}

const FunButton: React.FC<FunButtonProps> = ({ children, ...props }) => {
  return (
    <>
      <Button
        {...props}
        className="mt-4 w-100 py-4 px-8 text-white text-xl font-bold rounded-lg"
        style={{
          background: 'linear-gradient(45deg, #cc5de8, #845ef7, #5c7cfa, #339af0, #22b8cf, #339af0, #5c7cfa, #845ef7, #cc5de8, #845ef7, #5c7cfa, #339af0, #22b8cf, #339af0, #5c7cfa)',
          backgroundSize: '400% 400%',
          animation: 'gradientAnimation 14s linear infinite'
        }}
      >
        {children}
      </Button>
      <style jsx>{`
        @keyframes gradientAnimation {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  );
};

export default FunButton;
