import { useState } from 'react';
import { Globe, X, ExternalLink, Copy, Check } from 'lucide-react';

interface EdgeLaunchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  cameraName: string;
  onLaunch: () => void;
}

export default function EdgeLaunchDialog({ 
  isOpen, 
  onClose, 
  url, 
  cameraName, 
  onLaunch 
}: EdgeLaunchDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLaunch = () => {
    onLaunch();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Abrir en Microsoft Edge
              </h3>
              <p className="text-sm text-gray-500">
                {cameraName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-700 mb-3">
              ¿Deseas abrir esta cámara en Microsoft Edge con modo Internet Explorer?
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">URL de la cámara:</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-gray-900 bg-white px-2 py-1 rounded border break-all">
                  {url}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  title="Copiar URL"
                >
                  {copied ? (
                    <>
                      <Check size={12} />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-blue-600">i</span>
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Modo Internet Explorer</p>
                <p className="text-blue-700">
                  Edge se abrirá con compatibilidad de Internet Explorer para cámaras que requieren controles ActiveX o plugins antiguos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleLaunch}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Globe size={16} />
            Abrir en Edge
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
