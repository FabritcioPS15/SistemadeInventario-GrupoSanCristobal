// Configuración para lanzar aplicaciones externas desde el navegador

export interface CameraConnectionParams {
  ip?: string;
  username?: string;
  password?: string;
  authCode?: string;
  url?: string;
}

// Configuración de protocolos personalizados
export const APP_PROTOCOLS = {
  IVMS: 'ivms://',
  ESVIZ: 'esviz://',
  EDGE_IE: 'microsoft-edge:'
} as const;

// Función para abrir URL en Edge con modo Internet Explorer
export const openUrlInEdgeIE = (url: string): void => {
  // Intentar múltiples métodos para abrir Edge
  const methods = [
    () => {
      // Método 1: Protocolo msedge
      const edgeUrl = `msedge:${url}?ie=1`;
      window.open(edgeUrl, '_blank');
    },
    () => {
      // Método 2: Protocolo microsoft-edge
      const edgeUrl = `microsoft-edge:${url}?ie=1`;
      window.open(edgeUrl, '_blank');
    },
    () => {
      // Método 3: Usar iframe oculto para forzar el protocolo
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `msedge:${url}?ie=1`;
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 1000);
    },
    () => {
      // Método 4: Crear enlace y hacer clic programáticamente
      const link = document.createElement('a');
      link.href = `msedge:${url}?ie=1`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  ];

  // Intentar cada método secuencialmente
  let methodIndex = 0;
  const tryNextMethod = () => {
    if (methodIndex < methods.length) {
      try {
        methods[methodIndex]();
        methodIndex++;
        // Esperar un poco antes de intentar el siguiente método
        setTimeout(tryNextMethod, 200);
      } catch (error) {
        console.error(`Error en método ${methodIndex + 1}:`, error);
        methodIndex++;
        tryNextMethod();
      }
    } else {
      // Si todos los métodos fallan, mostrar instrucciones
      showEdgeInstructions(url);
    }
  };

  tryNextMethod();
};

// Función para mostrar instrucciones de Edge
const showEdgeInstructions = (url: string): void => {
  const message = `Para abrir esta URL en Microsoft Edge con modo Internet Explorer:

1. Copia esta URL: ${url}
2. Abre Microsoft Edge manualmente
3. Habilita el modo Internet Explorer:
   - Ve a Configuración (⚙️)
   - Selecciona "Características por defecto del sitio"
   - Busca "Internet Explorer mode"
   - Habilita "Permitir que los sitios se recarguen en modo Internet Explorer"
4. Pega la URL en la barra de direcciones

¿Quieres copiar la URL al portapapeles?`;

  if (confirm(message)) {
    navigator.clipboard.writeText(url).then(() => {
      alert('URL copiada al portapapeles');
    }).catch(() => {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('URL copiada al portapapeles');
    });
  }
};

// Función para mostrar el diálogo de Edge (similar a Zoom)
export const showEdgeLaunchDialog = (url: string, cameraName: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Crear el diálogo dinámicamente
    const dialog = createEdgeDialog(url, cameraName, resolve);
    document.body.appendChild(dialog);
  });
};

// Función para crear el diálogo dinámicamente
const createEdgeDialog = (url: string, cameraName: string, onResolve: (result: boolean) => void): HTMLElement => {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
  overlay.style.zIndex = '9999';

  const dialog = document.createElement('div');
  dialog.className = 'bg-white rounded-lg shadow-xl max-w-md w-full';
  
  dialog.innerHTML = `
    <div class="flex items-center justify-between p-6 border-b border-gray-200">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Copiar URL para Edge</h3>
          <p class="text-sm text-gray-500">${cameraName}</p>
        </div>
      </div>
      <button id="close-dialog" class="text-gray-400 hover:text-gray-600 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    
    <div class="p-6">
      <div class="mb-4">
        <p class="text-gray-700 mb-3">
          ¿Deseas copiar la URL para abrir esta cámara en Microsoft Edge?
        </p>
        
        <div class="bg-gray-50 rounded-lg p-3 mb-4">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
            <span class="text-sm font-medium text-gray-700">URL de la cámara:</span>
          </div>
          <div class="flex items-center gap-2">
            <code class="flex-1 text-sm text-gray-900 bg-white px-2 py-1 rounded border break-all">
              ${url}
            </code>
            <button id="copy-url" class="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              Copiar
            </button>
          </div>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div class="flex items-start gap-2">
          <div class="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
            <span class="text-xs font-bold text-blue-600">i</span>
          </div>
          <div class="text-sm text-blue-800">
            <p class="font-medium mb-1">Instrucciones</p>
            <p class="text-blue-700">
              1. Haz clic en "Copiar URL"<br>
              2. Abre Microsoft Edge<br>
              3. Pega la URL en la barra de direcciones<br>
              4. Habilita modo IE si es necesario
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
      <button id="launch-edge" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        Copiar URL
      </button>
      <button id="cancel-dialog" class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
        Cancelar
      </button>
    </div>
  `;

  // Event listeners
  const closeDialog = () => {
    document.body.removeChild(overlay);
    onResolve(false);
  };

  const launchEdge = async () => {
    // Copiar URL al portapapeles
    const success = await copyUrlToClipboard(url);
    
    // Mostrar mensaje informativo
    const message = success 
      ? 'URL copiada al portapapeles. Abre Edge y pega la URL.'
      : 'Error al copiar URL. Abre Edge manualmente.';
    
    const successMsg = document.createElement('div');
    successMsg.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
      success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    successMsg.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        ${message}
      </div>
    `;
    document.body.appendChild(successMsg);
    
    // Remover mensaje después de 4 segundos
    setTimeout(() => {
      if (document.body.contains(successMsg)) {
        document.body.removeChild(successMsg);
      }
    }, 4000);
    
    document.body.removeChild(overlay);
    onResolve(true);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      const copyBtn = dialog.querySelector('#copy-url');
      if (copyBtn) {
        copyBtn.innerHTML = `
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Copiado
        `;
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            Copiar
          `;
        }, 2000);
      }
    } catch (error) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  overlay.appendChild(dialog);
  
  // Attach event listeners
  overlay.querySelector('#close-dialog')?.addEventListener('click', closeDialog);
  overlay.querySelector('#cancel-dialog')?.addEventListener('click', closeDialog);
  overlay.querySelector('#launch-edge')?.addEventListener('click', launchEdge);
  overlay.querySelector('#copy-url')?.addEventListener('click', copyUrl);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDialog();
    }
  });

  return overlay;
};

// Función alternativa para abrir Edge (más directa)
export const openUrlInEdgeIEAlternative = (url: string, cameraName: string = 'Cámara'): void => {
  // Mostrar el diálogo personalizado
  showEdgeLaunchDialog(url, cameraName).then((launched) => {
    if (!launched) {
      // Si el usuario canceló, abrir en navegador actual
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  });
};

// Función para copiar URL al portapapeles
const copyUrlToClipboard = async (url: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return true;
    } else {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Error al copiar URL:', error);
    return false;
  }
};


// Función para abrir IVMS-4200
export const openIVMS = (params: CameraConnectionParams): void => {
  const { ip, username, password, authCode } = params;
  
  if (!ip) {
    alert('Error: No se ha configurado la IP para esta cámara IVMS');
    return;
  }

  try {
    // Intentar abrir con protocolo personalizado
    const ivmsUrl = `${APP_PROTOCOLS.IVMS}connect?ip=${ip}&user=${username || ''}&pass=${password || ''}&auth=${authCode || ''}`;
    window.open(ivmsUrl, '_blank');
  } catch (error) {
    console.error('Error al abrir IVMS:', error);
    // Fallback: mostrar información para conexión manual
    showIVMSConnectionInfo(params);
  }
};

// Función para abrir ESVIZ
export const openESVIZ = (params: CameraConnectionParams): void => {
  const { ip, username, password, authCode } = params;
  
  if (!ip) {
    alert('Error: No se ha configurado la IP para esta cámara ESVIZ');
    return;
  }

  try {
    // Intentar abrir con protocolo personalizado
    const esvizUrl = `${APP_PROTOCOLS.ESVIZ}connect?ip=${ip}&user=${username || ''}&pass=${password || ''}&auth=${authCode || ''}`;
    window.open(esvizUrl, '_blank');
  } catch (error) {
    console.error('Error al abrir ESVIZ:', error);
    // Fallback: mostrar información para conexión manual
    showESVIZConnectionInfo(params);
  }
};

// Función para mostrar información de conexión IVMS
const showIVMSConnectionInfo = (params: CameraConnectionParams): void => {
  const { ip, username, password, authCode } = params;
  
  const message = `IVMS-4200 - Información de Conexión

IP: ${ip || 'No configurada'}
Usuario: ${username || 'No configurado'}
Contraseña: ${password || 'No configurada'}
Código de Autenticación: ${authCode || 'No configurado'}

Instrucciones:
1. Abre IVMS-4200 manualmente
2. Crea una nueva conexión
3. Usa los datos mostrados arriba
4. Guarda la conexión para uso futuro`;

  alert(message);
};

// Función para mostrar información de conexión ESVIZ
const showESVIZConnectionInfo = (params: CameraConnectionParams): void => {
  const { ip, username, password, authCode } = params;
  
  const message = `ESVIZ - Información de Conexión

IP: ${ip || 'No configurada'}
Usuario: ${username || 'No configurado'}
Contraseña: ${password || 'No configurada'}
Código de Autenticación: ${authCode || 'No configurado'}

Instrucciones:
1. Abre ESVIZ manualmente
2. Crea una nueva conexión
3. Usa los datos mostrados arriba
4. Guarda la conexión para uso futuro`;

  alert(message);
};

// Función para verificar si una aplicación está disponible
export const checkAppAvailability = async (protocol: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const testUrl = `${protocol}test`;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = testUrl;
    
    const timeout = setTimeout(() => {
      document.body.removeChild(iframe);
      resolve(false);
    }, 1000);
    
    iframe.onload = () => {
      clearTimeout(timeout);
      document.body.removeChild(iframe);
      resolve(true);
    };
    
    iframe.onerror = () => {
      clearTimeout(timeout);
      document.body.removeChild(iframe);
      resolve(false);
    };
    
    document.body.appendChild(iframe);
  });
};

// Función para configurar protocolos personalizados (requiere permisos del sistema)
export const setupCustomProtocols = (): void => {
  console.log('Para configurar protocolos personalizados:');
  console.log('1. IVMS: ivms://');
  console.log('2. ESVIZ: esviz://');
  console.log('3. Estos protocolos deben estar registrados en el sistema operativo');
  console.log('4. Consulta la documentación de IVMS-4200 y ESVIZ para más detalles');
};
