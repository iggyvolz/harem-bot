import {Env} from "./index";
import {APIChannel, APIRole} from "discord-api-types/v10";
export async function setcategory(env: Env, guild: string, category: string): Promise<string> {
    await env.DB.prepare("DELETE FROM guilds WHERE `guild`=?").bind(guild).all();
    await env.DB.prepare("INSERT INTO guilds VALUES(?,?)").bind(guild, category).all();
    return "Category set";
}
export async function create(env: Env, guild: string, user: string, name: string): Promise<string> {
    const query = env.DB.prepare("SELECT * FROM harems WHERE `guild`=? AND `name`=?").bind(guild, name);
    const result = await query.all();
    if((result.results?.length ?? 0) > 0) {
        return `Harem ${name} already exists!`;
    }
    // create channel for harem
    let parent_id: undefined|string =
        (((await env.DB.prepare("SELECT * FROM guilds WHERE `guild`=?").bind(guild).all()).results ?? [])[0] as { parent: string } | undefined)?.parent;
    const channelResponse = await fetch(`https://discord.com/api/guilds/${guild}/channels`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${env.discordToken}`
        },
        body: JSON.stringify({
            name: name.replace(/ /g, '-') //replace spaces with dashes
                .replace(/[^a-zA-Z0-9-]/g, '') // remove special characters
                .toLowerCase(), // replace spaces with dashes,
            parent_id
        })
    });
    if(channelResponse.status > 299) {
        return `Error creating channel (${channelResponse.status}): ${await channelResponse.text()}`;
    }
    const channel: APIChannel = await channelResponse.json();

    // create role for harem
    const roleResponse = await fetch(`https://discord.com/api/guilds/${guild}/roles`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${env.discordToken}`
        },
        body: JSON.stringify({
            name: name,
        })
    });
    if(roleResponse.status > 299) {
        return `Error creating role (${roleResponse.status}): ${await roleResponse.text()}`;
    }
    const role : APIRole = await roleResponse.json();
    // make user a moderator for the channel
    const moderatorResponse = await fetch(`https://discordapp.com/api/channels/${channel.id}/permissions/${user}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${env.discordToken}`
        },
        body: JSON.stringify({
            "type": 1, // 0 for a role, 1 for a member
            "id": user,
            "allow": 8, // 8 is the bitfield value for the "manage channel" permission
            "deny": 0
        })
    });
    if(moderatorResponse.status > 299) {
        return `Error assigning harem owner (${moderatorResponse.status}): ${await moderatorResponse.text()}`;
    }
    // Give the role permissions to view the channel
    const rolePermissionResponse = await fetch(`https://discordapp.com/api/channels/${channel.id}/permissions/${role.id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${env.discordToken}`
        },
        body: JSON.stringify({
            "type": 0,
            "id": user,
            "allow": 0x0400, // view channel
            "deny": 0
        })
    });

    if(rolePermissionResponse.status > 299) {
        return `Error assigning harem role (${rolePermissionResponse.status}): ${await rolePermissionResponse.text()}`;
    }
    // Deny @everyone permissions to view the channel
    const everyoneResponse = await fetch(`https://discordapp.com/api/channels/${channel.id}/permissions/${guild}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${env.discordToken}`
        },
        body: JSON.stringify({
            "type": 0,
            "id": user,
            "allow": 0, // view channel
            "deny": 0x0400,
        })
    });

    if(everyoneResponse.status > 299) {
        return `Error assigning harem role (${rolePermissionResponse.status}): ${await rolePermissionResponse.text()}`;
    }

    // add user to role
    const memberResponse = await fetch(`https://discordapp.com/guilds/${guild}/members/${user}/roles/${role}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${env.discordToken}`
        },
    });

    if(memberResponse.status > 299) {
        return `Error assigning owner to role (${moderatorResponse.status}): ${await moderatorResponse.text()}`;
    }
    await env.DB.prepare("INSERT INTO harems VALUES (?,?,?,?)").bind(guild, name, role.id, channel.id).run();
    return `Harem ${name} successfully created`;
}

export async function delete_(env: Env, guild: string, name: string): Promise<string> {
    const query = env.DB.prepare("SELECT * FROM harems WHERE `guild`=? AND `name`=?").bind(guild, name);
    const result = await query.all();
    if((result.results?.length ?? 0) === 0) {
        return `Harem ${name} does not exist!`;
    }
    const {role, channel} = (result.results??[])[0] as {guild: string, name: string, role: string, channel: string};
    console.log(JSON.stringify({role, channel}));
    // delete role for harem
    const roleResponse = await fetch(`https://discordapp.com/api/guilds/${guild}/roles/${role}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${env.discordToken}`
        }
    });

    if (roleResponse.status > 299) {
        return `Error deleting harem ${name} role (${roleResponse.status}): ${await roleResponse.text()}`;
    }
    // delete channel for harem

    const channelResponse = await fetch(`https://discordapp.com/api/channels/${channel}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${env.discordToken}`
        }
    });

    if (channelResponse.status > 299) {
        return `Error deleting harem ${name} channel (${roleResponse.status}): ${await roleResponse.text()}`;
    }
    await env.DB.prepare("DELETE FROM harems WHERE `guild`=? AND `name`=?").bind(guild, name).run();
    return `Harem ${name} successfully deleted`;
}
export async function join(env: Env, guild: string, user: string, name: string): Promise<string> {
    const query = env.DB.prepare("SELECT * FROM harems WHERE `guild`=? AND `name`=?").bind(guild, name);
    const result = await query.all();
    if((result.results?.length ?? 0) === 0) {
        return `Harem ${name} does not exist!`;
    }
    const {role} = (result.results??[])[0] as {guild: string, name: string, role: string, channel: string};
    // add user to role
    const memberResponse = await fetch(`https://discordapp.com/api/guilds/${guild}/members/${user}/roles/${role}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${env.discordToken}`
        },
    });

    if(memberResponse.status > 299) {
        return `Error assigning user to role https://discordapp.com/api/guilds/${guild}/members/${user}/roles/${role} (${memberResponse.status}): ${await memberResponse.text()}`;
    }
    // console.log(memberResponse.status);
    // console.log((await memberResponse.text()));
    return `Successfully joined harem ${name}`;
}
export async function leave(env: Env, guild: string, user: string, name: string): Promise<string> {
    const query = env.DB.prepare("SELECT * FROM harems WHERE `guild`=? AND `name`=?").bind(guild, name);
    const result = await query.all();
    if((result.results?.length ?? 0) === 0) {
        return `Harem ${name} does not exist!`;
    }
    const {role} = (result.results??[])[0] as {guild: string, name: string, role: string, channel: string};
    // add user to role
    const memberResponse = await fetch(`https://discordapp.com/api/guilds/${guild}/members/${user}/roles/${role}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bot ${env.discordToken}`
        },
    });

    if(memberResponse.status > 299) {
        return `Error removing user from role (${memberResponse.status}): ${await memberResponse.text()}`;
    }
    return `Successfully left harem ${name}`;
}