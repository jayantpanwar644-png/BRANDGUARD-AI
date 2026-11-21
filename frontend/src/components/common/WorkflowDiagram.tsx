import React from 'react';
import { ContinuousLoopWorkflow } from './ContinuousLoopWorkflow';

interface WorkflowDiagramProps {
  className?: string;
}

export const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ className = '' }) => {
  return <ContinuousLoopWorkflow className={className} />;
};

export default WorkflowDiagram;
