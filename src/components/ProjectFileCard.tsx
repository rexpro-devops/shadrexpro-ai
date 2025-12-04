import React from 'react';
import { Code } from 'lucide-react';
import { Project } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ProjectFileCardProps {
  project: Project;
  onOpen: () => void;
}

const ProjectFileCard: React.FC<ProjectFileCardProps> = ({ project, onOpen }) => {
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  return (
    <Card className="my-4 p-4 flex items-center justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex-shrink-0 bg-background p-2 rounded-lg border">
          <Code className="h-5 w-5 text-text-secondary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate" title={project.name}>
            {project.name}
          </p>
          <p className="text-xs text-text-secondary">{formattedDate}</p>
        </div>
      </div>
      <Button
        onClick={onOpen}
        variant="outline"
      >
        Open
      </Button>
    </Card>
  );
};

export default ProjectFileCard;