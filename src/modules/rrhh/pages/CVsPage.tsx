import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';

export default function CVsPage() {
  // TODO: Actualizar con el link real de la carpeta de Drive
  const driveUrl = "https://drive.google.com/drive/folders/1"; 

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto text-center mt-10">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Gestión de CV's</h1>
        <p className="text-slate-600 mb-8">
          Los currículums vitae y documentos relacionados del personal están almacenados en una carpeta compartida de Google Drive para mayor seguridad y accesibilidad.
        </p>
        <a 
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
        >
          <span>Abrir Carpeta en Google Drive</span>
          <ExternalLink size={20} />
        </a>
      </div>
    </div>
  );
}
