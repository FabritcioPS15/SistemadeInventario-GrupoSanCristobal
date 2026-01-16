import { useState, useRef, useMemo } from 'react';
import { X, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase, AssetType, Location } from '../lib/supabase';

type ExcelImportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assetTypes: AssetType[];
    locations: Location[];
};

type RawSheet = {
    name: string;
    data: any[];
};

type SheetMapping = {
    sheetName: string;
    locationId: string; // empty string if not mapped
    ignore: boolean;
};

// Mapeo detallado de tipos de activos (variaciones comunes -> nombre exacto de BD)
// Palabras clave que deben estar presentes (no usar coincidencias parciales para evitar falsos positivos)
const ASSET_TYPE_KEYWORDS: Record<string, string> = {
    // Monitor - debe estar ANTES que otras búsquedas para evitar conflictos
    'MONITOR': 'Monitor',
    'MONITORES': 'Monitor',
    'MONITO': 'Monitor',
    'PANTALLA': 'Monitor',
    'PANTALLAS': 'Monitor',
    'PANTALLAS PARA PC': 'Monitor',
    'DISPLAY': 'Monitor',
    // PC variantes
    'COMPUTADORA': 'PC',
    'ORDENADOR': 'PC',
    'DESKTOP': 'PC',
    'PC ': 'PC',  // PC con espacio para evitar coincidencias con otros
    'CPU ': 'PC', // CPU con espacio para evitar coincidencias
    // Laptop variantes
    'PORTATIL': 'Laptop',
    'NOTEBOOK': 'Laptop',
    'LAPTOP': 'Laptop',
    // Celular variantes
    'TELEFONO': 'Celular',
    'SMARTPHONE': 'Celular',
    'MOVIL': 'Celular',
    'CELULAR': 'Celular',
    // Otros comunes
    'IMPRESORA': 'Impresora',
    'SCANNER': 'Escáner',
    'ESCANER': 'Escáner',
    'PROYECTOR': 'Proyector',
    'DATA': 'Proyector',
    'CAMARA': 'Cámara',
    'CÁMARA': 'Cámara',
    'DVR': 'DVR',
    'GRABADOR': 'DVR',
    'SWITCH': 'Switch',
    'FUENTE': 'Fuente de Poder',
    'TECLADO': 'Periféricos',
    'MOUSE': 'Periféricos',
    'MOUSEPAD': 'Periféricos',
    // Maquinaria - solo si es explícitamente maquinaria
    'MAQUINARIA': 'Maquinaria',
    'MÁQUINA': 'Maquinaria',
    'EQUIPO PESADO': 'Maquinaria',
    // Otros - por defecto
    'OTROS': 'Otros',
    'OTRO': 'Otros',
    'VARIOS': 'Otros',
};

// Mapeo inicial de sedes (variaciones comunes -> nombre exacto de BD)
const INITIAL_LOCATION_MAPPING: Record<string, string> = {
    'OFICINA': 'Oficina Principal',
    'CHINCH': 'Chincha',
    'PISCO': 'Pisco',
    'ICA': 'Ica',
    'SCP ICA': 'San Cristobal del Peru Ica',
    'SCP AND': 'San Cristobal del Peru Andahuaylas',
    'SCP AQP': 'Arequipa',
    'SCP CUS': 'Cusco',
    'SCP TRU': 'Trujillo',
    'SCP CHIC': 'Chiclayo',
    'SCP PIU': 'Piura',
    'SCP HYO': 'Huancayo',
};

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onSuccess, assetTypes, locations }) => {
    const [file, setFile] = useState<File | null>(null);
    const [rawSheets, setRawSheets] = useState<RawSheet[]>([]);
    const [mappings, setMappings] = useState<SheetMapping[]>([]);
    const [importing, setImporting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Función helper para convertir fechas vacías a null
    const parseDateField = (value: any): string | null => {
        if (!value || value === '' || value === null || value === undefined) return null;
        // Si es un número de Excel (días desde 1900)
        if (typeof value === 'number') {
            try {
                const excelEpoch = new Date(1899, 11, 30);
                const date = new Date(excelEpoch.getTime() + value * 86400000);
                return date.toISOString().split('T')[0];
            } catch {
                return null;
            }
        }
        // Si es una cadena de fecha
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return null;
            // Intentar parsear como fecha
            const parsed = new Date(trimmed);
            if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
            }
            return null;
        }
        return null;
    };

    // Función helper para limpiar campos vacíos (convertir a null si es string vacío)
    const cleanField = (value: any): string | null => {
        if (value === null || value === undefined || value === '') return null;
        const str = String(value).trim();
        return str === '' ? null : str;
    };

    // Cálculos derivados del estado actual de mappings y rawSheets
    const preview = useMemo(() => {
        if (!rawSheets.length) return null;

        let totalRecords = 0;
        let validRecords = 0;
        let invalidRecords = 0;
        const errors: string[] = [];
        const processedRecords: any[] = []; // Lista final lista para insertar

        rawSheets.forEach(sheet => {
            const mapping = mappings.find(m => m.sheetName === sheet.name);
            if (!mapping || mapping.ignore) return; // Si se ignora, no suma a nada

            const locationId = mapping.locationId;
            // Si no tiene ubicación seleccionada, cuenta como inválido si queremos ser estrictos
            // O simplemente lo marcamos. Asumamos que para importar DEBE tener ID.

            sheet.data.forEach((row) => {
                totalRecords++;

                if (!locationId) {
                    invalidRecords++;
                    return;
                }

                // Normalizar keys
                const normalizedRow: any = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.toUpperCase().trim()] = row[key];
                });

                // Detección de Tipo - Mejorada
                const typeRaw = (normalizedRow['TIPO DE ACTIVO'] || '').toString().trim().toUpperCase();
                let typeId = null;
                let typeMatch = null;
                
                // 1. Búsqueda exacta en BD
                typeMatch = assetTypes.find(t => t.name.toUpperCase() === typeRaw);

                // 2. Búsqueda por palabras clave (orden de prioridad - buscar coincidencias más específicas primero)
                if (!typeMatch && typeRaw) {
                    // Primero buscar palabras clave específicas que deben evitar falsos positivos
                    // Ordenar por longitud descendente para buscar coincidencias más específicas primero
                    const sortedKeywords = Object.keys(ASSET_TYPE_KEYWORDS).sort((a, b) => {
                        // Priorizar palabras más largas (más específicas)
                        if (b.length !== a.length) return b.length - a.length;
                        // Si tienen la misma longitud, priorizar Monitor, PC, Laptop antes que Maquinaria
                        const priority: Record<string, number> = { 'MONITOR': 100, 'MONITORES': 99, 'MONITO': 98, 'PANTALLA': 97, 'PANTALLAS': 96, 'PC ': 95, 'CPU ': 94, 'MAQUINARIA': 1 };
                        return (priority[b] || 50) - (priority[a] || 50);
                    });
                    
                    for (const keyword of sortedKeywords) {
                        // Buscar palabra clave completa (no parcial) para evitar falsos positivos
                        // Usar regex para buscar como palabra completa o inicio de palabra
                        const keywordEscaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`\\b${keywordEscaped}\\b|^${keywordEscaped}`, 'i');
                        
                        if (regex.test(typeRaw) || typeRaw === keyword || typeRaw.startsWith(keyword + ' ')) {
                            const targetTypeName = ASSET_TYPE_KEYWORDS[keyword];
                            typeMatch = assetTypes.find(t => t.name.toUpperCase() === targetTypeName.toUpperCase());
                            if (typeMatch) break;
                        }
                    }
                }

                // 3. Si no hay coincidencia, usar "Otros" como fallback
                if (!typeMatch) {
                    typeMatch = assetTypes.find(t => t.name.toUpperCase() === 'OTROS');
                    // Si "Otros" no existe, usar el primer tipo disponible (pero esto debería ser raro)
                    if (!typeMatch && assetTypes.length > 0) {
                        typeMatch = assetTypes[0];
                    }
                }

                if (typeMatch) typeId = typeMatch.id;
                const typeName = typeMatch?.name || 'Otros';

                // Estado
                const condition = (normalizedRow['CONDICIÓN'] || normalizedRow['ESTADO USO'] || '').toString().toUpperCase();
                let status = 'active';
                if (condition.includes('MALO') || condition.includes('AVERIADO') || condition.includes('DAÑADO') || condition.includes('INOPERATIVO')) {
                    status = 'maintenance';
                } else if (condition.includes('BAJA') || condition.includes('EXTRAIDO') || condition.includes('DESECHO')) {
                    status = 'inactive';
                }

                const isValid = !!typeId && !!locationId;

                if (isValid) {
                    validRecords++;
                    // Construir notas para campos que no existen en la BD (solo si hay notas adicionales)
                    const notesParts: string[] = [];

                    // Crear objeto base del activo
                    const assetRecord: any = {
                        asset_type_id: typeId,
                        location_id: locationId,
                        brand: normalizedRow['MARCA'] || 'Genérico',
                        model: normalizedRow['MODELO'] || 'Genérico',
                        serial_number: cleanField(normalizedRow['SERIE'] || normalizedRow['N° DE SERIE']),
                        status: status,
                        notes: notesParts.join(' | ') || null
                    };

                    // Agregar campos del Excel para TODOS los tipos de activos
                    assetRecord.item = cleanField(normalizedRow['ITEM']);
                    assetRecord.descripcion = cleanField(normalizedRow['DESCRIPCIÓN']);
                    assetRecord.unidad_medida = cleanField(normalizedRow['UNIDAD DE MEDIDA'] || normalizedRow['UNIDAD_MEDIDA']);
                    assetRecord.cantidad = parseInt(normalizedRow['CANT.'] || normalizedRow['CANTIDAD'] || '1') || 1;
                    assetRecord.condicion = cleanField(normalizedRow['CONDICIÓN'] || normalizedRow['CONDICION']);
                    assetRecord.color = cleanField(normalizedRow['COLOR']);
                    assetRecord.gama = cleanField(normalizedRow['GAMA']);
                    // Convertir fecha vacía a null
                    assetRecord.fecha_adquisicion = parseDateField(normalizedRow['FECHA ADQUISICION'] || normalizedRow['FECHA_ADQUISICION']);
                    const valorEstimado = parseFloat(normalizedRow['VALOR ESTIMADO'] || normalizedRow['VALOR_ESTIMADO'] || '0') || 0;
                    assetRecord.valor_estimado = valorEstimado > 0 ? valorEstimado : null;
                    assetRecord.estado_uso = cleanField(normalizedRow['ESTADO USO'] || normalizedRow['ESTADO_USO']);

                    // Agregar campos específicos para PC/Laptop
                    if (typeName === 'PC' || typeName === 'Laptop') {
                        assetRecord.processor = cleanField(normalizedRow['PROCESADOR']);
                        assetRecord.ram = cleanField(normalizedRow['RAM'] || normalizedRow['MEMORIA RAM']);
                        assetRecord.operating_system = cleanField(normalizedRow['SISTEMA OPERATIVO'] || normalizedRow['SO']);
                        assetRecord.bios_mode = cleanField(normalizedRow['MODO BIOS'] || normalizedRow['BIOS']);
                        assetRecord.area = cleanField(normalizedRow['AREA']);
                        assetRecord.placa = cleanField(normalizedRow['PLACA'] || normalizedRow['CODIGO PLACA']);
                    }

                    // Agregar campos específicos para Cámaras/DVR
                    if (typeName === 'Cámara' || typeName === 'DVR') {
                        assetRecord.name = cleanField(normalizedRow['NOMBRE'] || normalizedRow['NOMBRE DISPOSITIVO']);
                        assetRecord.url = cleanField(normalizedRow['URL'] || normalizedRow['URL ACCESO']);
                        assetRecord.username = cleanField(normalizedRow['USUARIO'] || normalizedRow['USUARIO ACCESO']);
                        assetRecord.password = cleanField(normalizedRow['CONTRASEÑA'] || normalizedRow['PASSWORD']);
                        assetRecord.port = cleanField(normalizedRow['PUERTO'] || normalizedRow['PORT']);
                        assetRecord.access_type = cleanField(normalizedRow['TIPO ACCESO'] || normalizedRow['ACCESS TYPE']) || 'url';
                        assetRecord.auth_code = cleanField(normalizedRow['CODIGO AUTENTICACION'] || normalizedRow['AUTH CODE']);
                    }

                    // Agregar campos específicos para Celulares
                    if (typeName === 'Celular') {
                        assetRecord.imei = cleanField(normalizedRow['IMEI']);
                        assetRecord.operator = cleanField(normalizedRow['OPERADOR'] || normalizedRow['COMPANIA']);
                        assetRecord.data_plan = cleanField(normalizedRow['PLAN DATOS'] || normalizedRow['PLAN DE DATOS']);
                        assetRecord.physical_condition = cleanField(normalizedRow['ESTADO FISICO'] || normalizedRow['CONDICION FISICA']);
                        assetRecord.sistema_operativo = cleanField(normalizedRow['SISTEMA OPERATIVO'] || normalizedRow['SO MOVIL']);
                        assetRecord.version_so = cleanField(normalizedRow['VERSION SO'] || normalizedRow['VERSION SISTEMA']);
                        assetRecord.almacenamiento = cleanField(normalizedRow['ALMACENAMIENTO'] || normalizedRow['MEMORIA INTERNA']);
                        assetRecord.bateria_estado = cleanField(normalizedRow['ESTADO BATERIA'] || normalizedRow['BATERIA']);
                        assetRecord.accesorios = cleanField(normalizedRow['ACCESORIOS']);
                    }

                    // Agregar campos específicos para Impresoras/Escáneres
                    if (typeName === 'Impresora' || typeName === 'Escáner') {
                        assetRecord.tipo_impresion = cleanField(normalizedRow['TIPO IMPRESION'] || normalizedRow['TIPO']);
                        assetRecord.tecnologia_impresion = cleanField(normalizedRow['TECNOLOGIA'] || normalizedRow['TECNOLOGIA IMPRESION']);
                        assetRecord.velocidad_impresion = parseInt(normalizedRow['VELOCIDAD'] || normalizedRow['VELOCIDAD IMPRESION'] || normalizedRow['PPM'] || '0') || null;
                        assetRecord.resolucion = cleanField(normalizedRow['RESOLUCION'] || normalizedRow['DPI']);
                    }

                    // Agregar campos específicos para Monitores/Proyectores
                    if (typeName === 'Monitor' || typeName === 'Proyector') {
                        assetRecord.tamaño_pantalla = cleanField(normalizedRow['TAMAÑO PANTALLA'] || normalizedRow['TAMAÑO'] || normalizedRow['PULGADAS']);
                        assetRecord.resolucion_pantalla = cleanField(normalizedRow['RESOLUCION PANTALLA'] || normalizedRow['RESOLUCION']);
                        assetRecord.tipo_conexion = cleanField(normalizedRow['TIPO CONEXION'] || normalizedRow['CONECTOR'] || normalizedRow['CONEXION']);
                        assetRecord.luminosidad = parseInt(normalizedRow['LUMINOSIDAD'] || normalizedRow['LUMENES'] || '0') || null;
                    }

                    processedRecords.push(assetRecord);
                } else {
                    invalidRecords++;
                    if (!typeId) {
                        // Solo agregamos el error si no es repetido masivamente
                        const msg = `Tipo '${typeRaw}' no reconocido en hoja '${sheet.name}'`;
                        if (!errors.includes(msg) && errors.length < 5) errors.push(msg);
                    }
                }
            });
        });

        return {
            totalSheets: rawSheets.length,
            totalRecords,
            validRecords,
            invalidRecords,
            errors,
            processedRecords
        };

    }, [rawSheets, mappings, assetTypes]);


    if (!isOpen) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            handleFileSelect(droppedFile);
        } else {
            alert('Por favor, sube un archivo Excel válido (.xlsx o .xls)');
        }
    };

    const guessLocation = (sheetName: string) => {
        const normalizedSheetName = sheetName.trim().toUpperCase();

        // 1. Coincidencia directa con sedes BD
        let exactMatch = locations.find(l => {
            const locName = l.name.toUpperCase();
            return locName === normalizedSheetName ||
                normalizedSheetName.includes(locName) ||
                locName.includes(normalizedSheetName);
        });
        if (exactMatch) return exactMatch.id;

        // 2. Mapeo Manual Inicial
        const mappedKey = Object.keys(INITIAL_LOCATION_MAPPING).find(key => normalizedSheetName.includes(key));
        if (mappedKey) {
            const targetName = INITIAL_LOCATION_MAPPING[mappedKey].toUpperCase();
            const mappedMatch = locations.find(l => {
                const locName = l.name.toUpperCase();
                return locName === targetName || locName.includes(targetName) || targetName.includes(locName);
            });
            if (mappedMatch) return mappedMatch.id;
        }

        return '';
    };

    const handleFileSelect = async (selectedFile: File) => {
        setFile(selectedFile);
        setRawSheets([]);
        setMappings([]);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                const loadedSheets: RawSheet[] = [];
                const initialMappings: SheetMapping[] = [];

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    if (jsonData.length > 0) {
                        loadedSheets.push({
                            name: sheetName,
                            data: jsonData
                        });

                        initialMappings.push({
                            sheetName: sheetName,
                            locationId: guessLocation(sheetName),
                            ignore: false
                        });
                    }
                });

                setRawSheets(loadedSheets);
                setMappings(initialMappings);

            } catch (error) {
                console.error('Error parsing excel:', error);
                alert('Error al leer el archivo Excel.');
            }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const handleMappingChange = (sheetName: string, newLocationId: string) => {
        setMappings(prev => prev.map(m =>
            m.sheetName === sheetName ? { ...m, locationId: newLocationId } : m
        ));
    };

    const handleToggleIgnore = (sheetName: string) => {
        setMappings(prev => prev.map(m =>
            m.sheetName === sheetName ? { ...m, ignore: !m.ignore } : m
        ));
    };

    // Función para asegurar que "Otros" existe en la BD
    const ensureOtrosType = async (): Promise<string | null> => {
        try {
            // Buscar si "Otros" ya existe
            const { data: existing } = await supabase
                .from('asset_types')
                .select('id')
                .eq('name', 'Otros')
                .single();

            if (existing) return existing.id;

            // Crear "Otros" si no existe
            const { data: newType, error } = await supabase
                .from('asset_types')
                .insert([{ name: 'Otros' }])
                .select()
                .single();

            if (error) {
                // Si falla, podría ser porque ya existe (race condition)
                const { data: retry } = await supabase
                    .from('asset_types')
                    .select('id')
                    .eq('name', 'Otros')
                    .single();
                if (retry) return retry.id;
                console.error('Error al crear tipo Otros:', error);
                return null;
            }

            return newType?.id || null;
        } catch (error) {
            console.error('Error al verificar/crear tipo Otros:', error);
            return null;
        }
    };

    const handleImport = async () => {
        if (!preview || !preview.processedRecords.length) return;
        setImporting(true);

        try {
            // Asegurar que "Otros" existe antes de importar
            await ensureOtrosType();
            
            const batchSize = 50;
            const records = preview.processedRecords;
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                const { error } = await supabase.from('assets').insert(batch);
                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Import error:', error);
            alert('Error al importar datos: ' + error.message);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Importar Inventario desde Excel</h3>
                        <p className="text-sm text-slate-500">Mapear manualmente las hojas a las sedes</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    {!file ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-white ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="bg-green-100 p-4 rounded-full mb-4">
                                <FileSpreadsheet className="text-green-600" size={32} />
                            </div>
                            <h4 className="text-lg font-medium text-slate-700 mb-2">
                                Arrastra tu archivo Excel aquí
                            </h4>
                            <button className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium text-sm">
                                Seleccionar Archivo
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* File Info & Summary */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-700 font-medium text-center">
                                    ✅ Archivo seleccionado: {file.name}
                                </p>
                            </div>

                            {/* Stats Cards */}
                            {preview && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                        <div className="text-2xl font-bold text-slate-800">{preview.totalSheets}</div>
                                        <div className="text-xs text-slate-500 uppercase font-bold">Hojas detectadas</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                        <div className="text-2xl font-bold text-blue-600">{preview.totalRecords}</div>
                                        <div className="text-xs text-slate-500 uppercase font-bold">Total Registros</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-green-500">
                                        <div className="text-2xl font-bold text-green-600">{preview.validRecords}</div>
                                        <div className="text-xs text-slate-500 uppercase font-bold">Listos para importar</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-red-500">
                                        <div className="text-2xl font-bold text-red-600">{preview.invalidRecords}</div>
                                        <div className="text-xs text-slate-500 uppercase font-bold">Inválidos / Sin Sede</div>
                                    </div>
                                </div>
                            )}

                            {/* MAPPING TABLE */}
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                                    <h5 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Mapeo de Sedes por Hoja</h5>
                                    <span className="text-xs text-slate-500">Asocia cada hoja del excel a una sede del sistema</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                                            <tr>
                                                <th className="px-6 py-3">Hoja (Excel)</th>
                                                <th className="px-6 py-3">Registros</th>
                                                <th className="px-6 py-3">Sede destino (Sistema)</th>
                                                <th className="px-6 py-3 text-center">Estado</th>
                                                <th className="px-6 py-3 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {mappings.map((mapping, idx) => {
                                                const sheetStat = rawSheets.find(s => s.name === mapping.sheetName);
                                                const recordCount = sheetStat?.data.length || 0;
                                                const isMapped = !!mapping.locationId;

                                                return (
                                                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${mapping.ignore ? 'opacity-50' : ''}`}>
                                                        <td className="px-6 py-3 font-medium text-slate-800">
                                                            {mapping.sheetName}
                                                        </td>
                                                        <td className="px-6 py-3 text-slate-600">
                                                            {recordCount}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <select
                                                                value={mapping.locationId}
                                                                onChange={(e) => handleMappingChange(mapping.sheetName, e.target.value)}
                                                                disabled={mapping.ignore}
                                                                className={`w-full max-w-xs px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isMapped && !mapping.ignore ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200'
                                                                    }`}
                                                            >
                                                                <option value="">-- Seleccionar Sede --</option>
                                                                {locations.map(loc => (
                                                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            {mapping.ignore ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                                    Ignorado
                                                                </span>
                                                            ) : isMapped ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                                    <CheckCircle size={12} /> Listo
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                                    <AlertCircle size={12} /> Pendiente
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <button
                                                                onClick={() => handleToggleIgnore(mapping.sheetName)}
                                                                className="text-xs font-medium text-slate-500 hover:text-slate-800 underline"
                                                            >
                                                                {mapping.ignore ? 'Habilitar' : 'Ignorar'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Maquinaria Fields Help */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle size={20} className="text-blue-600 mt-0.5" />
                                    <div>
                                        <h5 className="font-bold text-blue-800 text-sm mb-2">Campos para Maquinaria</h5>
                                        <p className="text-blue-700 text-xs mb-3">Para importar maquinarias, tu Excel debe incluir estas columnas:</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">ITEM</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">DESCRIPCIÓN</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">UNIDAD DE MEDIDA</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">CANT.</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">CONDICIÓN</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">TIPO DE ACTIVO</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">UBICACIÓN DEL ACTIVO</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">COLOR</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">SERIE</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">GAMA</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">MODELO</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">MARCA</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">FECHA ADQUISICIÓN</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">VALOR ESTIMADO</span>
                                            </div>
                                            <div className="bg-white rounded px-2 py-1 border border-blue-200">
                                                <span className="font-medium">ESTADO USO</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Validation Errors */}
                            {preview && preview.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                                    <h5 className="text-red-800 font-medium text-sm mb-2 flex items-center gap-2">
                                        <AlertCircle size={14} /> Alertas de validación
                                    </h5>
                                    <ul className="list-disc list-inside text-xs text-red-600">
                                        {preview.errors.slice(0, 3).map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                        {preview.errors.length > 3 && <li>...y {preview.errors.length - 3} más</li>}
                                    </ul>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white rounded-b-xl flex justify-between items-center">
                    <div className="text-xs text-slate-400 font-medium">
                        {preview ? `${preview.validRecords} registros válidos de ${preview.totalRecords} totales` : 'Esperando archivo...'}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
                            disabled={importing}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!file || !preview || preview.validRecords === 0 || importing}
                            className={`
                                flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium text-sm shadow-sm transition-all
                                ${!file || !preview || preview.validRecords === 0 || importing
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-slate-800 hover:bg-slate-900 shadow-md hover:shadow-lg'
                                }
                            `}
                        >
                            {importing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Importando...
                                </>
                            ) : (
                                <>
                                    Importar {preview?.validRecords || 0} Registros
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExcelImportModal;
