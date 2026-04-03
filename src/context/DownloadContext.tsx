import React, { createContext, useContext, useState, ReactNode } from "react";

export type DownloadStatus = "downloading" | "completed" | "error";

export interface ActiveDownload {
  ebookId: string;
  title: string;
  coverImage?: string;
  progress: number;
  status: DownloadStatus;
}

interface DownloadContextType {
  downloads: Record<string, ActiveDownload>;
  startDownload: (
    ebookId: string, 
    title: string, 
    coverImage: string | undefined, 
    onCompleteAction: () => Promise<void>
  ) => void;
  removeDownload: (ebookId: string) => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const DownloadProvider = ({ children }: { children: ReactNode }) => {
  const [downloads, setDownloads] = useState<Record<string, ActiveDownload>>({});

  const startDownload = async (
    ebookId: string,
    title: string,
    coverImage: string | undefined,
    onCompleteAction: () => Promise<void>
  ) => {
    // If it's already downloading, don't restart
    if (downloads[ebookId]?.status === "downloading") return;

    setDownloads((prev) => ({
      ...prev,
      [ebookId]: {
        ebookId,
        title,
        coverImage,
        progress: 0,
        status: "downloading",
      },
    }));

    // Simular o progresso em steps
    let currentProgress = 0;
    const intervalTime = 50; // ms
    const totalTime = 2500; // 2.5 second sim
    const step = 100 / (totalTime / intervalTime);

    const intervalId = setInterval(() => {
      currentProgress += step;
      if (currentProgress >= 100) {
        clearInterval(intervalId);
        
        // Finalizar e registar na base de dados
        onCompleteAction().then(() => {
          setDownloads((prev) => ({
            ...prev,
            [ebookId]: {
              ...prev[ebookId],
              progress: 100,
              status: "completed",
            },
          }));
        }).catch(() => {
          setDownloads((prev) => ({
            ...prev,
            [ebookId]: {
              ...prev[ebookId],
              progress: 0,
              status: "error",
            },
          }));
          // Optionally revert after error
          setTimeout(() => removeDownload(ebookId), 3000);
        });
      } else {
        setDownloads((prev) => ({
          ...prev,
          [ebookId]: {
            ...prev[ebookId],
            progress: Math.min(Math.round(currentProgress), 99),
          },
        }));
      }
    }, intervalTime);
  };

  const removeDownload = (ebookId: string) => {
    setDownloads((prev) => {
      const newDownloads = { ...prev };
      delete newDownloads[ebookId];
      return newDownloads;
    });
  };

  return (
    <DownloadContext.Provider value={{ downloads, startDownload, removeDownload }}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloadContext = () => {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error("useDownloadContext must be used within a DownloadProvider");
  }
  return context;
};
