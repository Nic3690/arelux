/**
 * This function expects to be called with a body containing:
 * - `to`: the email address of the recipient
 * - `tenant`: the code of the tenant
 * - `items`: an array of objects of the form `{code: "XNR01C", qty: 2}`
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Handlebars from 'npm:handlebars';
import * as nodemailer from 'npm:nodemailer';

function getEnv(name: string): string {
	const val = Deno.env.get(name);
	if (val === undefined) throw new Error(`Unknown environment variable: '${name}'`);
	return val;
}

type RequestBody = { to: string; file: string; tenant: string };

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');
const EMAIL_USER = getEnv('EMAIL_USER');
const EMAIL_SENDER = getEnv('EMAIL_SENDER');
const EMAIL_PASSWORD = getEnv('EMAIL_PASSWORD');

Handlebars.registerHelper('euros', (amount: string) =>
	Number.parseFloat(amount).toFixed(2).replace('.', ','),
);

Deno.serve(async (req: Request): Promise<Response> => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
			},
		});
	}

	const { to, tenant, file }: RequestBody = await req.json();

	const authHeader = req.headers.get('Authorization')!;
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		global: { headers: { Authorization: authHeader } },
	});

	let text = supabase.storage
		.from(tenant)
		.getPublicUrl('email.txt')
		.data.publicUrl.replace('127.0.0.1:54321', 'supabase_kong_configuratore_admin:8000');
	text = await (await fetch(text)).text();
	let html = supabase.storage
		.from(tenant)
		.getPublicUrl('email.html')
		.data.publicUrl.replace('127.0.0.1:54321', 'supabase_kong_configuratore_admin:8000');
	html = await (await fetch(html)).text();
	let subject = supabase.storage
		.from(tenant)
		.getPublicUrl('email.subj')
		.data.publicUrl.replace('127.0.0.1:54321', 'supabase_kong_configuratore_admin:8000');
	subject = await (await fetch(subject)).text();

	const transporter = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 587,
		secure: false,
		requireTLS: true,
		auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
	});
	const res = await transporter.sendMail({
		from: EMAIL_SENDER,
		to,
		subject,
		text,
		html,
		attachments: [{ filename: 'invoice.pdf', content: file, encoding: 'base64' }],
	});

	return new Response(JSON.stringify(res), {
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
		},
	});
});
