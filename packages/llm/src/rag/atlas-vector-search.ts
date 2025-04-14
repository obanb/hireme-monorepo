import {MongoClient, MongoClientOptions, ServerApiVersion} from "mongodb";

export const client = new MongoClient("mongodb+srv://ratpile:TeiKh5l8PYBastxF@cluster0.mw28u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",  {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: false,
            deprecationErrors: true,
        }
    }  as MongoClientOptions
);
