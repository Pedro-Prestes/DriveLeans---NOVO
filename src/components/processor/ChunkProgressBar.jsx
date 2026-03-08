export default function ChunkProgressBar({ lastByte, fileSize }) {
  const percent = fileSize > 0 ? Math.min(100, Math.round((lastByte / fileSize) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{(lastByte / 1024 / 1024).toFixed(2)} MB lidos</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      {fileSize > 0 && (
        <div className="text-xs text-gray-400 text-right">
          de {(fileSize / 1024 / 1024).toFixed(2)} MB
        </div>
      )}
    </div>
  );
}