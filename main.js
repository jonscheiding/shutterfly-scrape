const fs = require("fs");
const Crawler = require("crawler");
const request = require("request");

const crawler = new Crawler();

const uris = process.argv.slice(2);

crawler.queue(uris.map(uri => {
    const jar = request.jar();
    return {
        uri: uri,
        jar: jar,
        maxConnections: 1,
        callback: (error, res, done) => {
            if(error) {
                console.error(error);
                return;
            }

            console.log(uri);

            var $ = res.$;
            var scripts = $("script:not([src])");

            for(let i = 0; i < scripts.length; i++) {
                const content = $(scripts[i]).html();
                if(!content.match(/albumView\.initialize/)) {
                    continue;
                }
                executeInMockShutterflyEnvironment(content, jar);
            }        
        }
    }
}));

function downloadShutterflyImages(data, jar) {
    const dir = `downloaded/${data.result.createDate.replace(/\//g, '-')}`;
    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    console.log(`Downloading album ${data.result.albumTitle} (${data.result.createDate}).`)

    const images = JSON.parse(data.result.images);
    for (const image of images) {
        request({
            uri: image.largeImageUrl,
            jar: jar,
        })
        .on('response', () => console.log(`Downloaded ${image.filename}`))
        .pipe(fs.createWriteStream(`${dir}/${image.filename}`));
    }
}

function executeInMockShutterflyEnvironment(content, jar) {
    const document = {};
    const $ = () => ({
        ready: f => f()
    });
    const albumView = {
        initialize: downloadShutterflyImages
    };
    
    try {
        eval(content);
    } catch(e) {
        console.error(`Failed to evaluate script: ${e}`);
        console.log(content);
    }
}