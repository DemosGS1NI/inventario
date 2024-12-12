<script>
    let file = null;

    const uploadFile = async () => {
        if (!file) {
            alert('Please select a file before uploading.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload-excel', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.success);
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload the file.');
        }
    };
</script>

<div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
    <h1 class="text-2xl font-bold mb-6">Carga Datos Excel</h1>
    <div class="bg-white p-6 rounded-lg shadow-md w-80">
        <input
            type="file"
            accept=".xlsx"
            on:change={(e) => (file = e.target.files[0])}
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4"
        />
        <button
            on:click={uploadFile}
            class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition"
        >
            Upload
        </button>
    </div>
</div>
