import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, subtitle, icon: Icon, className }) {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-5 flex items-start gap-4 transition-all hover:shadow-sm",
      className
    )}>
      {Icon && (
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}