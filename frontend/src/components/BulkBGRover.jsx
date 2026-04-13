import React, { useState } from "react";

const BulkBGRover = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFiles(Array.from(event.target.files));
  };

  const processImages = async () => {
    setIsProcessing(true);

    for (const file of selectedFiles) {
      console.log(`Processing: ${file.name}`);

      // Add your background-removal API call here.
      // Example flow:
      // 1. Upload the file to your server
      // 2. Receive the processed image
      // 3. Provide a download link for the result
    }

    setIsProcessing(false);
    alert("All images have been processed.");
  };

  return (
    <div className="p-10 border-dashed border-2 border-blue-400 rounded-lg text-center">
      <h2 className="text-xl font-bold mb-4">EditNest Bulk BG Remover</h2>
      <input type="file" multiple onChange={handleFileChange} className="mb-4" />
      <p>{selectedFiles.length} files selected</p>

      <button
        onClick={processImages}
        disabled={isProcessing}
        className="bg-blue-600 text-white px-6 py-2 rounded mt-4 hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isProcessing ? "Processing..." : "Start Bulk Processing"}
      </button>
    </div>
  );
};

export default BulkBGRover;
