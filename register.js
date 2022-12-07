// Call with the arguments: applicationid, botToken
// As of node 17, you have to run with --experimental-fetch
const [
    _,
    __,
    applicationId,
    botToken
] = process.argv;
fetch(`https://discord.com/api/v9/applications/${applicationId}/commands`, {
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bot ${botToken}`
    },
    method: "POST",
    body: JSON.stringify({
        name: "harem",
        description: "Harem bot",
        options: [
            {
                type: 1,
                name: "join",
                description: "Joins a harem",
                autocomplete: true,
                options: [
                    {
                        name: "name",
                        autocomplete: true,
                        description: "Name of the harem",
                        type: 3,
                        required: true,
                    }
                ]
            },
            {
                type: 1,
                name: "leave",
                description: "Leave a harem",
                options: [
                    {
                        name: "name",
                        autocomplete: true,
                        description: "Name of the harem",
                        type: 3,
                        required: true,
                    }
                ]
            }
        ]
    })
}).then(x => x.text()).then(x => console.log(x))

fetch(`https://discord.com/api/v9/applications/${applicationId}/commands`, {
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bot ${botToken}`
    },
    method: "POST",
    body: JSON.stringify({
        name: "haremadmin",
        description: "Harem bot (admin commands)",
        default_member_permissions: "0",
        options: [
            {
                type: 1,
                name: "category",
                description: "Set the category for harems",
                options: [
                    {
                        name: "category",
                        type: 7,
                        required: true,
                        description: "Category to put channels in"
                    }
                ]
            },
            {
                type: 1,
                name: "create",
                description: "Creates a harem",
                options: [
                    {
                        name: "owner",
                        type: 6,
                        required: true,
                        description: "Owner of the harem"
                    },
                    {
                        name: "name",
                        type: 3,
                        required: true,
                        description: "Name of the harem"
                    }
                ]
            },
            {
                type: 1,
                name: "delete",
                description: "Deletes a harem",
                options: [
                    {
                        name: "name",
                        type: 3,
                        required: true,
                        description: "Name of the harem",
                        autocomplete: true,
                    }
                ]
            },
        ]
    })
}).then(x => x.text()).then(x => console.log(x))