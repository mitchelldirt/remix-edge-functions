import type {LoaderArgs} from '@vercel/remix';
import {Form, useLoaderData} from '@remix-run/react';
import {ActionArgs} from '@remix-run/node';
import {varchar, mysqlTable} from "drizzle-orm/mysql-core";
import {z, ZodError} from 'zod';

import {Footer} from '~/components/footer';
import {Region} from '~/components/region';
import {Illustration} from '~/components/illustration';
import {parseVercelId} from '~/parse-vercel-id';
import db from "~/db";

export const config = {runtime: 'edge'};

let isCold = true;
let initialDate = Date.now();

export async function loader({request}: LoaderArgs) {
    const wasCold = isCold;
    isCold = false;

    const parsedId = parseVercelId(request.headers.get("x-vercel-id"));

    return {
        ...parsedId,
        isCold: wasCold,
        date: new Date().toISOString(),
    };
}

export async function action({request}: ActionArgs) {
    const body = await request.formData();
    let name = body.get('name');


    if (!name) {
        return new Response('Missing name', {status: 400});
    }

    try {
        name = z.string().min(1).max(100).parse(name);

        const nameTable = mysqlTable("test_table", {
            name: varchar('name', {length: 100})
        })

        await db.insert(nameTable).values({name: name}).execute();
    } catch (e) {

        if (e instanceof ZodError) {
            return new Response('Invalid name', {status: 400});
        }

        return new Response('Internal error', {status: 500});
    }


    return null;
}

export function headers() {
    return {
        'x-edge-age': Date.now() - initialDate,
    };
}

export default function App() {
    const {proxyRegion, computeRegion, isCold, date} = useLoaderData<typeof loader>();
    return (
        <>
            <main>
                <Illustration/>
                <div className="meta">
                    <div className="info">
                        <span>Proxy Region</span>
                        <Region region={proxyRegion}/>
                    </div>
                    <div className="info">
                        <span>Compute Region</span>
                        <Region region={computeRegion}/>
                    </div>
                </div>
                <Form method="post">
                    <input type={"text"} name={"name"}/>
                    <button type={"submit"}>Submit</button>
                </Form>
            </main>

            <Footer>
                <p>
                    Generated at {date} <span data-break/> ({isCold ? 'cold' : 'hot'}) by{' '}
                    <a href="https://vercel.com/docs/concepts/functions/edge-functions" target="_blank"
                       rel="noreferrer">
                        Vercel Edge Runtime
                    </a>
                </p>
            </Footer>
        </>
    );
}

