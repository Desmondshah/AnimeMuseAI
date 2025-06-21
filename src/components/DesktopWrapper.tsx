import React from 'react';

interface DesktopWrapperProps {
  children: React.ReactNode;
  className?: string;
  desktopClassName?: string;
  mobileClassName?: string;
}

/**
 * DesktopWrapper - A utility component to apply desktop-specific styling
 * while preserving mobile styles. Use this to wrap existing components
 * and add desktop enhancements.
 */
const DesktopWrapper: React.FC<DesktopWrapperProps> = ({
  children,
  className = '',
  desktopClassName = '',
  mobileClassName = ''
}) => {
  return (
    <div className={`${className} ${mobileClassName} ${desktopClassName}`}>
      {children}
    </div>
  );
};

export default DesktopWrapper; 