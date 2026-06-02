/**
 * Utility function to upload a file directly to ImgBB
 * using the provided API key: dc27fab1fc79e9e04ab24f192bc3146e
 */
export async function uploadToImgBB(file: File): Promise<string> {
  const apiKey = 'dc27fab1fc79e9e04ab24f192bc3146e';
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ImgBB upload error response:', errorText);
    throw new Error('فشل رفع الصورة إلى خوادم ImgBB. يرجى المحاولة لاحقاً.');
  }

  const data = await response.json();
  if (data && data.success && data.data && data.data.url) {
    return data.data.url;
  } else {
    throw new Error('استجابة غير متوقعة من خادم رفع الصور، يرجى المحاولة مجدداً.');
  }
}
