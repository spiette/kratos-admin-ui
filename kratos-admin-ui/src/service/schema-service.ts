import { Identity, IdentityApi, IdentitySchemaContainer } from "@ory/kratos-client";
import { getKratosConfig } from "../config";

export interface SchemaField {
    name: string;
    title: string;
    parentName?: string;
}

export interface DetailListModel {
    [key: string]: string;
}

export class SchemaService {

    private static schema_ids: string[] = [];
    private static schema_map: Map<string, any> = new Map<string, any>();

    static async getSchemaIDs(): Promise<string[]> {
        if (this.schema_ids.length === 0) {
            const config = await getKratosConfig()
            const publicAPI = new IdentityApi(config.publicConfig)
            return publicAPI.listIdentitySchemas().then(data => {
                this.extractSchemas(data.data)
                return this.schema_ids;
            });
        }
        return new Promise(resolve => {
            resolve(this.schema_ids);
        })
    }

    static async getSchemaJSON(schema: string): Promise<any> {
        if (this.schema_map.has(schema)) {
            return new Promise(resolve => {
                resolve(this.schema_map.get(schema))
            })
        } else {
            const config = await getKratosConfig()
            const publicAPI = new IdentityApi(config.publicConfig)
            const schemaResponse = await publicAPI.getIdentitySchema({ id: schema });
            this.extractSchemas([schemaResponse.data])
            return this.schema_map.get(schema)
        }
    }

    static getSchemaFields(schema: any): SchemaField[] {
        if (schema === undefined) {
            console.warn("getSchemaFields: schema is undefined")
            return [];
        }
        let array: SchemaField[] = [];

        array = array.concat(this.getSchemaFieldsInternal(schema.properties.traits))
        return array;
    }

    static getSchemaFieldsInternal(schema: any, parentName?: string): SchemaField[] {
        let array: SchemaField[] = [];
        const properties = schema.properties;
        for (const key of Object.keys(properties)) {
            if (properties[key].properties) {
                array = array.concat(this.getSchemaFieldsInternal(properties[key], key))
            } else {
                array.push({
                    name: key,
                    title: properties[key].title,
                    parentName: parentName
                });
            }
        }

        return array;
    }

    static mapKratosIdentity(data: Identity, fields: SchemaField[]): DetailListModel {
        return this.mapKratosIdentites([data], fields)[0];
    }

    static mapKratosIdentites(data: Identity[], fields: SchemaField[]): DetailListModel[] {
        return data.map(element => {
            const traits: any = element.traits;
            const type: any = { key: element.id };

            fields.forEach(f => {
                if (f.parentName) {
                    type[f.name] = traits[f.parentName]?.[f.name]
                } else {
                    type[f.name] = traits[f.name]
                }
            })

            return type;
        })
    }

    static extractSchemas(identitySchemas: IdentitySchemaContainer[]) {
        if (identitySchemas.length === 0) {
            this.schema_ids.push("default")
        }
        identitySchemas.forEach(schema => {
            if (this.schema_ids.indexOf(schema.id!) === -1) {
                this.schema_ids.push(schema.id!);
            }

            // since v0.11 the schema is base64 encoded
            //const parsedJSON = JSON.parse(window.atob(schema.schema + ""))
            //this.schema_map.set(schema.id!, parsedJSON)

            // since v0.13 the schema isnt base64 encoded anymore
            this.schema_map.set(schema.id!, schema.schema)
        });
    }
}