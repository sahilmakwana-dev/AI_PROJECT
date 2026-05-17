import { json } from '@sveltejs/kit';
import { CLOUDINARY_API_SECRET } from '$env/static/private';
import crypto from 'crypto';

export async function POST({ request }) {
	try {
		const { upload_preset, timestamp } = await request.json();
		
		// Cloudinary requires parameters to be sorted alphabetically
		const paramsToSign = `timestamp=${timestamp}&upload_preset=${upload_preset}`;
		
		// Generate SHA-1 hash of the parameters concatenated with the API secret
		const shasum = crypto.createHash('sha1');
		shasum.update(paramsToSign + CLOUDINARY_API_SECRET);
		const signature = shasum.digest('hex');
		
		return json({ signature });
	} catch (error) {
		console.error("Signature generation error:", error);
		return json({ error: 'Failed to generate signature' }, { status: 500 });
	}
}
