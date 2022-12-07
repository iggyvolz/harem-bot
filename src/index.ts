import {
	APIApplicationCommandAutocompleteResponse,
	APIInteraction,
	APIInteractionResponseChannelMessageWithSource,
	APIInteractionResponsePong,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
	MessageFlags
} from 'discord-api-types/v10';
import {create, delete_, join, leave, setcategory} from "./harem";

export interface Env {
	publicKey: string;
	DB: D1Database;
	discordToken: string;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		try {
			return await handleRequest(request, env, ctx);
		} catch(e) {
			console.error((e));
			return new Response("", {status: 500})
		}
	},
};

// https://github.com/discord/discord-interactions-js/blob/main/src/index.ts
/**
 * Merge two arrays.
 *
 */
function concatUint8Arrays(arr1: Uint8Array, arr2: Uint8Array): Uint8Array {
	const merged = new Uint8Array(arr1.length + arr2.length);
	merged.set(arr1);
	merged.set(arr2, arr1.length);
	return merged;
}

/**
 * Validates a payload from Discord against its signature and key.
 *
 */
async function verifyKey(
	body: string,
	signature: string,
	timestamp: string,
	clientPublicKey: string,
): Promise<boolean> {
	try {
		const timestampData = new TextEncoder().encode(timestamp);
		const bodyData = new TextEncoder().encode(body);
		const message = concatUint8Arrays(timestampData, bodyData);

		const signatureData = new Uint8Array((signature.match(/.{2}/g) ?? []).map((byte) => parseInt(byte, 16)));
		const publicKeyData = new Uint8Array((clientPublicKey.match(/.{2}/g) ?? []).map((byte) => parseInt(byte, 16)));
		const algorithm = {name: 'NODE-ED25519', namedCurve: 'NODE-ED25519'};
		const publicKey = await crypto.subtle.importKey("raw", publicKeyData, algorithm, true, ["verify"]);
		return await crypto.subtle.verify(algorithm, publicKey, signatureData, message);
	} catch (ex) {
		return false;
	}
}

/**
 * Respond with hello worker text
 */
async function handleRequest(
	request: Request,
	env: Env,
	ctx: ExecutionContext
): Promise<Response> {
	const signature = request.headers.get("X-Signature-Ed25519") ?? "";
	const timestamp = request.headers.get("X-Signature-Timestamp") ?? "";

	const bodyText = await request.text()
	if(!await verifyKey(bodyText, signature, timestamp, env.publicKey)) {
		return new Response("", {
			status: 400
		});
	}
	const body: APIInteraction = JSON.parse(bodyText)
	if(body.type === InteractionType.Ping) {
		const response: APIInteractionResponsePong = {
			type: InteractionResponseType.Pong
		};
		return new Response(JSON.stringify(response), {
			headers: {
				"Content-Type": "application/json"
			}
		})
	}
	if(body.type === InteractionType.ApplicationCommand && body.data.type == ApplicationCommandType.ChatInput) {
		const options = (body.data.options ?? []);
		const command: string = options[0]?.name ?? "";
		if(options[0]?.type !== ApplicationCommandOptionType.Subcommand) {
			return new Response("", {status: 400});
		}
		const suboptions = options[0].options ?? [];
		if(command === "category") {
			const category = suboptions[0].value;
			if(typeof category !== "string") {
				return new Response("", {status: 400});
			}
			const response: APIInteractionResponseChannelMessageWithSource = {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content: await setcategory(env, body.guild_id ?? "", category),
					allowed_mentions: {
						parse: []
					}
				}
			}
			return new Response(JSON.stringify(response), {
				headers: {
					"Content-Type": "application/json"
				}
			})
		}
		if(command === "create") {
			const user = suboptions[0].value;
			if(typeof user !== "string") {
				return new Response("", {status: 400});
			}
			const name = suboptions[1].value;
			if(typeof name !== "string") {
				return new Response("", {status: 400});
			}
			const response: APIInteractionResponseChannelMessageWithSource = {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content: await create(env, body.guild_id ?? "", user, name),
					allowed_mentions: {
						parse: []
					}
				}
			}
			return new Response(JSON.stringify(response), {
				headers: {
					"Content-Type": "application/json"
				}
			})
		}
		if(command === "delete") {
			const name = suboptions[0].value;
			if(typeof name !== "string") {
				return new Response("", {status: 400});
			}
			const response: APIInteractionResponseChannelMessageWithSource = {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content: await delete_(env, body.guild_id ?? "",name),
					allowed_mentions: {
						parse: []
					}
				}
			}
			return new Response(JSON.stringify(response), {
				headers: {
					"Content-Type": "application/json"
				}
			})
		}
		if(command === "join") {
			const user = body.member?.user.id ?? "";
			const name = suboptions[0].value;
			if(typeof name !== "string") {
				return new Response("", {status: 400});
			}
			const response: APIInteractionResponseChannelMessageWithSource = {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content: await join(env, body.guild_id ?? "",user, name),
					allowed_mentions: {
						parse: []
					}
				}
			}
			return new Response(JSON.stringify(response), {
				headers: {
					"Content-Type": "application/json"
				}
			})
		}
		if(command === "leave") {
			const user = body.member?.user?.id ?? "";
			const name = suboptions[0].value;
			if(typeof name !== "string") {
				return new Response("", {status: 400});
			}
			const response: APIInteractionResponseChannelMessageWithSource = {
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					flags: MessageFlags.Ephemeral,
					content: await leave(env, body.guild_id ?? "",user, name),
					allowed_mentions: {
						parse: []
					}
				}
			}
			return new Response(JSON.stringify(response), {
				headers: {
					"Content-Type": "application/json"
				}
			})
		}
	}
	if(body.type === InteractionType.ApplicationCommandAutocomplete) {
		const response: APIApplicationCommandAutocompleteResponse = {
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
			data: {
				choices: ((await env.DB.prepare("SELECT * FROM harems WHERE `guild`=?").bind(body.guild_id ?? "").all()).results ??[]).map((x) => ({
					name: (x as {name: string}).name,
					value: (x as {name: string}).name
				}))
			}
		}

		return new Response(JSON.stringify(response), {
			headers: {
				"Content-Type": "application/json"
			}
		})
	}
	return new Response("", {status: 400});
}