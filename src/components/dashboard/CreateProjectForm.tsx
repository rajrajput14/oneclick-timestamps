'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateProjectForm({ usageAllowed }: { usageAllowed: boolean }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const formData = new FormData();
            if (activeTab === 'url') {
                if (!youtubeUrl) throw new Error('Specify a URL');
                formData.append('youtubeUrl', youtubeUrl);
            } else {
                if (!file) throw new Error('Specify a file');
                formData.append('transcriptFile', file);
            }

            const response = await fetch('/api/projects/create', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Generation failed');
            router.push(`/dashboard/project/${data.projectId}`);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10">
            {/* Tabs - Glass style */}
            <div className="flex glass-darker p-1.5 rounded-2xl max-w-[280px]">
                {(['url', 'upload'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-primary-foreground shadow-lg scale-105' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {tab === 'url' ? 'Link 🔗' : 'File 📁'}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="glass-darker p-1 rounded-[2rem] border-indigo-500/10 focus-within:border-indigo-500/40 transition-all">
                    {activeTab === 'url' ? (
                        <input
                            type="text"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="Enter YouTube Link..."
                            className="w-full bg-transparent px-10 py-8 text-sm font-black text-foreground outline-none border-none placeholder:text-muted-foreground/30 uppercase tracking-widest underline-offset-8"
                        />
                    ) : (
                        <div className="relative group">
                            <input
                                type="file"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="w-full px-10 py-8 text-sm font-black opacity-0 absolute inset-0 cursor-pointer z-10"
                            />
                            <div className="px-10 py-8 text-sm font-black text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-4">
                                <span className="p-3 glass-darker rounded-xl group-hover:scale-110 transition-transform">📄</span>
                                {file ? file.name : 'Choose Transcript File...'}
                            </div>
                        </div>
                    )}
                </div>

                {error && <p className="text-[10px] font-black uppercase text-red-500 tracking-widest text-center animate-bounce">{error}</p>}

                <button
                    type="submit"
                    disabled={loading || !usageAllowed}
                    className="w-full py-6 bg-indigo-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-[1.5rem] hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-indigo-500/30"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-4">
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v0\nC5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Synthesizing...
                        </span>
                    ) : (
                        'Build Project ✨'
                    )}
                </button>
            </form>
        </div>
    );
}
