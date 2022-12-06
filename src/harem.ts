import {Env} from "./index";

export async function create(env: Env, user: string, name: string): Promise<string> {
    const query = env.DB.prepare("SELECT * FROM harems WHERE `Name`=?").bind(name);
    const result = await query.all();
    if((result.results?.length ?? 0) > 0) {
        return `Harem ${name} already exists!`;
    }
    // TODO create role for harem
    // TODO create channel for harem
    // TODO make user a moderator for channel
    await env.DB.prepare("INSERT INTO harems VALUES (?,?,?)").bind(name, -1, -1).run();
    return `Harem ${name} successfully created`;
}

export async function delete_(env: Env, name: string): Promise<string> {
    const query = env.DB.prepare("SELECT * FROM harems WHERE `Name`=?").bind(name);
    const result = await query.all();
    if((result.results?.length ?? 0) === 0) {
        return `Harem ${name} does not exist!`;
    }
    await env.DB.prepare("DELETE FROM harems WHERE `Name`=?").bind(name).run();
    // TODO delete role for harem
    // TODO delete channel for harem
    return `Harem ${name} successfully deleted`;
}
export async function join(env: Env, user: string, name: string): Promise<string> {
    return "TODO";
}
export async function leave(env: Env, user: string, name: string): Promise<string> {
    return "TODO";
}