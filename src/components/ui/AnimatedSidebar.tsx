// Componente de Sidebar Animado com Framer Motion
// Fornece animacoes suaves de expansao/recolhimento ao passar o mouse
// Adaptado para React (sem dependencias do Next.js)

import React, { useState, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';

// Interface para links do menu
interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

// Props do contexto da sidebar
interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

// Contexto para compartilhar estado da sidebar entre componentes
const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

// Hook customizado para acessar o contexto da sidebar
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

// Provider que gerencia o estado aberto/fechado da sidebar
export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  // Permite controle externo ou interno do estado
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

// Componente principal Sidebar - wrapper com provider
export const AnimatedSidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

// Corpo da sidebar - renderiza versao desktop ou mobile
export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<'div'>)} />
    </>
  );
};

// Versao desktop da sidebar com animacao de largura
export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        'h-full px-4 py-4 hidden md:flex md:flex-col bg-white w-[260px] flex-shrink-0',
        'shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]',
        className
      )}
      animate={{
        width: animate ? (open ? '260px' : '72px') : '260px',
      }}
      transition={{
        duration: 0.3,
        ease: 'easeInOut',
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Versao mobile da sidebar com animacao de slide
export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      {/* Header mobile com botao de menu */}
      <div
        className={cn(
          'h-14 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-white w-full',
          'shadow-sm'
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-slate-700 cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        {/* Sidebar mobile animada */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: 'easeInOut',
              }}
              className={cn(
                'fixed h-full w-full inset-0 bg-white p-6 z-[100] flex flex-col justify-between',
                className
              )}
            >
              {/* Botao de fechar */}
              <div
                className="absolute right-6 top-6 z-50 text-slate-700 cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <X />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// Link da sidebar com animacao de texto
export const SidebarLink = ({
  link,
  className,
  onClick,
  isActive,
  ...props
}: {
  link: Links;
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
}) => {
  const { open, animate } = useSidebar();

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-start gap-3 group/sidebar py-2.5 px-3 rounded-lg w-full text-left',
        'transition-colors duration-150',
        isActive
          ? 'bg-slate-50 text-slate-900'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{
          duration: 0.2,
          ease: 'easeInOut',
        }}
        className={cn(
          'text-sm font-medium whitespace-pre inline-block !p-0 !m-0',
          'group-hover/sidebar:translate-x-0.5 transition-transform duration-150'
        )}
      >
        {link.label}
      </motion.span>
    </button>
  );
};

// Componente para texto animado generico
export const SidebarText = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { open, animate } = useSidebar();

  return (
    <motion.span
      animate={{
        display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
        opacity: animate ? (open ? 1 : 0) : 1,
      }}
      transition={{
        duration: 0.2,
        ease: 'easeInOut',
      }}
      className={cn('whitespace-pre', className)}
    >
      {children}
    </motion.span>
  );
};

// Componente para elementos que devem aparecer/desaparecer com a animacao
export const SidebarAnimatedContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { open, animate } = useSidebar();

  return (
    <motion.div
      animate={{
        opacity: animate ? (open ? 1 : 0) : 1,
        scale: animate ? (open ? 1 : 0.95) : 1,
      }}
      transition={{
        duration: 0.2,
        ease: 'easeInOut',
      }}
      className={cn(
        animate && !open ? 'pointer-events-none' : '',
        className
      )}
    >
      {children}
    </motion.div>
  );
};
