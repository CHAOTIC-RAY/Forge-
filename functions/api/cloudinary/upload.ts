export const onRequestPost: PagesFunction<{
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
}> = async (context) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return new Response(JSON.stringify({ error: "No image file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Cloudinary Signed Upload requires a signature
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "forge_posts";
    
    // Create signature
    const strToSign = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(strToSign);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', image);
    cloudinaryFormData.append('api_key', env.CLOUDINARY_API_KEY);
    cloudinaryFormData.append('timestamp', timestamp.toString());
    cloudinaryFormData.append('folder', folder);
    cloudinaryFormData.append('signature', signature);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: cloudinaryFormData
    });

    const result: any = await uploadRes.json();

    if (!uploadRes.ok) {
      return new Response(JSON.stringify({ 
        error: "Failed to upload image to Cloudinary", 
        details: result.error?.message || "Unknown Cloudinary error" 
      }), {
        status: uploadRes.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      url: result.secure_url,
      public_id: result.public_id,
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: "Internal Server Error", 
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
