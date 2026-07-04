import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { Package, CheckCircle2, XCircle, FileUp, AlertTriangle, Plus, ChevronDown, Check, Trash2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { auth } from '../../lib/firebase';

interface InventoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueId: string;
  eventId?: string;
}

export const InventoryImportModal: React.FC<InventoryImportModalProps> = ({ isOpen, onClose, venueId, eventId }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [failedRows, setFailedRows] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setParsedData(null);
    setFailedRows([]);
    setErrorMsg(null);
    setImportStatus(null);
    setIsDragActive(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processCsv = (file: File) => {
    setIsImporting(true);
    setErrorMsg(null);
    setImportStatus(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawItems = results.data as any[];
          if (rawItems.length === 0) {
            setErrorMsg("The uploaded CSV file contains no parsable data rows.");
            setIsImporting(false);
            return;
          }

          const validMappedItems: any[] = [];
          const invalidMappedItems: any[] = [];

          rawItems.forEach((item, index) => {
            const rawPrice = item.Price || item.price || '0';
            const rawStock = item.Stock || item.stock || item.Quantity || item.quantity || '0';
            const price = parseFloat(rawPrice.toString().replace(/[^\d.-]/g, ''));
            const stock = parseInt(rawStock.toString(), 10);
            const name = item['Description/Name'] || item.Description || item.Name || item.name || '';
            const code = item.Code || item.code || item.SKU || item.sku || '';

            const mapped = {
              code: (code || '').toString().substring(0, 15).trim(),
              name: (name || '').trim(),
              description: (item.Description || item.description || item['Description/Name'] || item.Name || item.name || '').trim(),
              type: (item.Type || item.type || '').trim(),
              department: (item.Department || item.department || '').trim(),
              unit_of_measure: (item['Unit of Measure'] || item.Unit || item.unit || '').trim(),
              tax_type: (item['Tax Type'] || item.Tax || item.tax || '').trim(),
              price: isNaN(price) ? 0 : price,
              stock: isNaN(stock) ? 0 : stock,
              category: (item.Category || item.category || item.Department || item.department || 'Uncategorized').trim(),
              status: ((isNaN(stock) ? 0 : stock) > 0) ? 'Available' : 'Sold Out',
              is_active: true,
              venue_id: venueId,
              eventId: eventId
            };

            if (mapped.name) {
              validMappedItems.push(mapped);
            } else {
              invalidMappedItems.push({ ...item, rowNum: index + 1 });
            }
          });

          if (validMappedItems.length === 0 && invalidMappedItems.length > 0) {
            setErrorMsg(`Failed to import: ${invalidMappedItems.length} row(s) were found, but all lacked a valid "Name" or "Description" column.`);
          } else {
            setParsedData(validMappedItems);
            setFailedRows(invalidMappedItems);
          }
        } catch (err: any) {
          console.error("CSV Mapping Error:", err);
          setErrorMsg("Data conversion error: " + err.message);
        } finally {
          setIsImporting(false);
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        setErrorMsg("Failed to parse file: " + error.message);
        setIsImporting(false);
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
        processCsv(file);
      } else {
        setErrorMsg("Invalid file format. Please upload an RFC-compliant CSV file.");
      }
    }
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
      processCsv(file);
    } else {
      setErrorMsg("Invalid file format. Please upload an RFC-compliant CSV file.");
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      console.log(`📡 Dispatching WriteBatch for ${parsedData.length} inventory records...`);
      const success = await inventoryService.addBulkItems(parsedData, auth.currentUser?.uid || 'anonymous');
      
      if (success) {
        setImportStatus({
          success: parsedData.length,
          failed: failedRows.length
        });
        setParsedData(null);
      } else {
        setErrorMsg("Critical Exception: Firebase WriteBatch transaction was rejected.");
      }
    } catch (err: any) {
      console.error("Firestore Transaction Failed:", err);
      setErrorMsg("Transaction aborted: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePreviewItem = (index: number) => {
    if (!parsedData) return;
    const updated = [...parsedData];
    updated.splice(index, 1);
    setParsedData(updated.length > 0 ? updated : null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            className="bg-surface-container border border-outline/30 rounded-[2.5rem] p-6 sm:p-8 w-full max-w-2xl space-y-6 shadow-2xl relative overflow-hidden"
          >
             {/* Header Section */}
             <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Package size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight">Catalog Integration</h2>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Client-Side CSV Schema Parser</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors group">
                   <Plus className="rotate-45 group-hover:scale-110 transition-transform" size={24} />
                </button>
             </div>
             
             <div className="space-y-4">
                {/* 1. Show Import Execution Success/Failure Stats */}
                {importStatus ? (
                  <div className="p-8 bg-black/25 rounded-3xl border border-outline/50 text-center space-y-6 animate-in fade-in zoom-in duration-200">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                      <CheckCircle2 size={36} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Sync Completed</h3>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Firestore Catalogs Synchronized</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto bg-background/50 border border-outline/30 p-4 rounded-2xl">
                      <div className="text-center py-2">
                        <p className="text-2xl font-black text-emerald-400 font-mono">{importStatus.success}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant mt-1">Created</p>
                      </div>
                      <div className="text-center py-2 border-l border-white/5">
                        <p className={`text-2xl font-black font-mono ${importStatus.failed > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{importStatus.failed}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant mt-1">Incomplete</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        onClick={resetState}
                        className="px-6 h-11 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                      >
                        Ingest New CSV File
                      </button>
                    </div>
                  </div>
                ) : parsedData ? (
                  /* 2. State: CSV parsed, showing preview and grid adjustments */
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
                    <div className="flex justify-between items-center bg-background/50 border border-outline/25 p-4 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface">Data Verification Grid ({parsedData.length} Items Indexed)</span>
                      </div>
                      {failedRows.length > 0 && (
                        <span className="text-[8px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md">
                          Skipped {failedRows.length} Rows (Missing Name)
                        </span>
                      )}
                    </div>

                    {/* Preview Table */}
                    <div className="border border-outline/30 rounded-2xl overflow-hidden bg-background max-h-[16rem] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant font-mono">
                            <th className="p-3 pl-4">Name / sku</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Price</th>
                            <th className="p-3">Stock</th>
                            <th className="p-3 pr-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-on-surface/90">
                          {parsedData.map((item, idx) => (
                            <tr key={`raw-${idx}`} className="hover:bg-white/5 transition-colors">
                              <td className="p-3 pl-4">
                                <p className="font-bold truncate max-w-[12rem]">{item.name}</p>
                                <p className="text-[9px] text-zinc-500 font-mono tracking-wider">{item.code || 'NO SKU'}</p>
                              </td>
                              <td className="p-3 font-medium text-xs">
                                <span className="bg-white/5 px-2 py-1 rounded-md text-[9px] uppercase tracking-widest font-mono text-zinc-400 font-bold border border-white/5">{item.category}</span>
                              </td>
                              <td className="p-3 font-mono font-bold text-primary">R {item.price.toFixed(2)}</td>
                              <td className="p-3 font-mono font-bold">
                                <span className={item.stock < 5 ? "text-amber-400" : "text-white"}>{item.stock}</span>
                              </td>
                              <td className="p-3 pr-4 text-center">
                                <button 
                                  onClick={() => handleRemovePreviewItem(idx)}
                                  className="text-white/40 hover:text-red-400 transition-colors p-1 hover:bg-red-500/10 rounded-md"
                                  title="Omit from upload batch"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Operational controls */}
                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={resetState}
                        className="flex-1 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        Abort Import
                      </button>
                      
                      <button 
                        onClick={handleConfirmImport}
                        disabled={isSubmitting}
                        className="flex-1 h-12 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        {isSubmitting ? 'Syncing Catalog...' : 'Deploy to Live Catalog'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 3. Base State: Upload zone supporting click and drag-drop dragover logic */
                  <div className="space-y-4">
                     <div 
                       onDragEnter={handleDrag}
                       onDragOver={handleDrag}
                       onDragLeave={handleDrag}
                       onDrop={handleDrop}
                       onClick={() => fileInputRef.current?.click()}
                       className={`p-10 rounded-3xl border-2 border-dashed text-center space-y-4 cursor-pointer transition-all duration-300 ${
                         isDragActive 
                           ? "border-primary bg-primary/10 scale-[1.01]" 
                           : "border-outline/50 hover:border-primary/50 hover:bg-white/5 bg-background"
                       }`}
                     >
                        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center transition-transform ${isDragActive ? 'scale-110 text-primary bg-primary/20' : 'text-primary/60 bg-primary/5'}`}>
                          <FileUp size={28} className={isImporting ? "animate-bounce" : ""} />
                        </div>
                        <div className="space-y-1">
                           <p className="text-xs font-black uppercase tracking-tight">Bulk CSV Catalog Import</p>
                           <p className="text-[9px] font-semibold text-on-surface-variant uppercase tracking-widest leading-relaxed">
                             Drag and Drop CSV, or click to browse
                           </p>
                           <p className="text-[8px] font-black text-primary uppercase tracking-widest mt-2">
                             Expected headers: Code, Description/Name, Category, Price, Stock
                           </p>
                        </div>
                        
                        <input 
                          type="file" 
                          accept=".csv" 
                          ref={fileInputRef}
                          onChange={handleCsvImport}
                          className="hidden"
                        />
                     </div>
                  </div>
                )}

                {/* Exception logger output */}
                {errorMsg && (
                  <div className="p-4 bg-red-500/15 border border-red-500/25 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
                    <XCircle size={14} className="text-red-400 mt-1 flex-shrink-0" />
                    <p className="text-[10px] font-black uppercase text-red-400 leading-tight">
                       Operational Error: {errorMsg}
                    </p>
                  </div>
                )}

                {/* Guidelines and schema references */}
                {!parsedData && (
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                     <AlertTriangle size={14} className="text-primary mt-0.5 flex-shrink-0" />
                     <p className="text-[8px] font-black uppercase text-primary leading-relaxed">
                        Database Warning: The ledger parses headers matching (Code / SKU), (Description / Name), (Price), (Stock) and (Category) natively. Ensure price formatting does not contain symbols or formatting letters to guarantee safe transactions.
                     </p>
                  </div>
                )}

                <div className="flex justify-center pt-2">
                  <button 
                    onClick={onClose}
                    className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancel Operations
                  </button>
                </div>
             </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

