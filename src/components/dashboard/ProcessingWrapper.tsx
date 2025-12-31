'use client';

import { useState, useEffect } from 'react';
import { ProcessingView } from './ProcessingView';

interface PollingWrapperProps {
    initialProject: any;
}

export default function ProcessingWrapper({ initialProject }: PollingWrapperProps) {
    const [project, setProject] = useState(initialProject);

    useEffect(() => {
        // Only poll if the project is in a non-terminal state
        if (project.status === 'completed' || project.status === 'failed') {
            return;
        }

        const poll = async () => {
            try {
                const res = await fetch(`/api/projects/${project.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setProject(data);

                    // If finished, refresh the page or stop polling
                    if (data.status === 'completed') {
                        // Refresh to show the final view
                        window.location.reload();
                    }
                }
            } catch (error) {
                console.error('Polling failed:', error);
            }
        };

        const interval = setInterval(poll, 2000); // Poll every 2 seconds
        return () => clearInterval(interval);
    }, [project.id, project.status]);

    const progress = {
        progress_percent: project.progress_percent ?? project.progressPercent ?? 0,
        progress_message: project.progress_message ?? project.progressMessage ?? 'Processing...',
        status: project.status,
        progress_step: project.progress_step ?? project.progressStep ?? 1,
        processedMinutes: project.processedMinutes
    };

    return <ProcessingView progress={progress} />;
}
