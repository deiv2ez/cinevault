import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, subtitle, icon: Icon, className }) {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-3.5 md:p-5 flex items-start gap-2.5 md:gap-4 transition-all hover:shadow-sm",
      className
    )}>
      {Icon && (
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" strokeWidth={1.5} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider leading-tight">{title}</p>
        <p className="text-xl md:text-2xl font-bold text-foreground mt-0.5 md:mt-1">{value}</p>
        {subtitle && <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}