import { Hammer } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export const ComingSoon = ({ title, phase, description }: { title: string; phase: number; description: string }) => (
  <div className="animate-fade-up">
    <PageHeader title={title} />
    <Card>
      <EmptyState icon={<Hammer className="size-4" />} title={`Coming in Phase ${phase}`} description={description} />
    </Card>
  </div>
);
