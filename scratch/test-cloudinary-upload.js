const CLOUD_NAME = 'dizhbrjdv';
const UPLOAD_PRESET = 'cbm_gestao';
const TEST_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function testUpload() {
  console.log("Testing unsigned upload with filename_override...");
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  
  try {
    const formData = new URLSearchParams();
    formData.append('file', TEST_BASE64);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('filename_override', 'test_file_name_png'); // no slashes!
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log("Upload successful! Secure URL:", data.secure_url);
    } else {
      console.error("Upload failed:", data);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testUpload();
