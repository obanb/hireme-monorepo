import {MongoClient, MongoClientOptions, ServerApiVersion} from "mongodb";
import {openai} from "../openai/openaiClient";
import {OpenAIEmbeddings} from "@langchain/openai";


const IDX_NAME = "vector_index";
const __EMBEDDINGS__ = 'text-embedding-3-small'

export const client = new MongoClient("mongodb+srv://ratpile:TeiKh5l8PYBastxF@cluster0.mw28u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",  {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: false,
            deprecationErrors: true,
        }
    }  as MongoClientOptions
);

const database = client.db("hireme");
const citiesColl = database.collection("cities");


export const atlasVectorSearch = async(query: string) => {
    const indexes = await citiesColl.listSearchIndexes(IDX_NAME).toArray();
    if (indexes.length === 0) {
        console.log("Creating search index");
        await citiesColl.createSearchIndex({
            type: "vectorSearch",
            name: IDX_NAME,
            definition: {
                "fields": [
                    {
                        "type": "vector",
                        "numDimensions": 1536,
                        "path": "embedding",
                        "similarity": "cosine"
                    },
                    {
                        "type": "filter",
                        "path": "loc.pageNumber"
                    }
                ]
            }
        })
    }else {
        console.log("Index already exists");
        for(const index in indexes){
            console.log(index);
        }
    }


    const embeddings = new OpenAIEmbeddings({
        model: __EMBEDDINGS__
    })

    const data = [
        "Brno: population 401999, the second largest city in the Czech Republic..",
        "Prague: population 1300199 the capital of the Czech Republic..",
    ]

    await Promise.all(data.map(async text => {
        // Check if the document already exists
        const existingDoc = await citiesColl.findOne({ text: text });
        // Generate an embedding by using the function that you defined
        if (!existingDoc) {
            const em = await openai.embeddings.create({
                model: __EMBEDDINGS__,
                input: text,
            })
            await citiesColl.insertOne({
                text: text,
                embedding: em.data[0].embedding
            });
        }
    }));


    const embedding_q = await openai.embeddings.create({
        model: __EMBEDDINGS__,
        input: query,
   });

    const agg = [
        {
            '$vectorSearch': {
                'index': 'vector_index',
                'path': 'embedding',
                'queryVector': embedding_q.data[0].embedding,
                'exact': false,
                'limit': 2,
                'numCandidates': 2
            }
        }, {
            '$project': {
                '_id': 0,
                'text': 1,
                'score': {
                    '$meta': 'vectorSearchScore'
                }
            }
        }
    ];

    const result =  await citiesColl.aggregate(agg).toArray();

    await result.forEach((doc) => console.dir(JSON.stringify(doc)));

    return result;
}
