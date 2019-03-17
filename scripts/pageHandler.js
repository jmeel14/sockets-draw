const fs = require('fs');
const pr = require("./render.js");
const shortcuts = {
    "": "app", "/": "app",
    "/index": "app", "/index.html": "app", "/index/": "app",
    "/app": "app", "/app.html": "app", "/app/": "app"
}
function WebsiteException(excCode, excBody){
    return `<body><h1>${excCode}</h1><p>${excBody}</p>`;
}
function access(callback){
    fs.readFile("./data/pages.json", function(err, data){
        if(err){
            console.log(err);
            callback(err);
            return;
        }
        callback(null, data);
    });
}
function confirm(url, callback){
    access(function(err, data){
        if(err){
            console.log(err);
            callback(WebsiteException(
                "HTTP 500 - Server Error",
                "A server error has occurred processing your request. Please try again later."
                ), 500);
            return;
        }
        let pages = JSON.parse(data.toString("utf-8"));
        if(!shortcuts[url]){
            callback(WebsiteException(
                "HTTP 404 - Page Not Found",
                "The server could not serve you the page you requested. It may have been moved, changed, or deleted."
                ), 404);
            return;
        }
        if(pages[shortcuts[url]]){
            callback(null, 200, pages[shortcuts[url]]);
            return;
        }
        callback(WebsiteException(
            "HTTP 500 - Server Error",
            "A server error has occurred processing your request. Please try again later."
            ), 500);
        return;
    });
}
function build(fileData, callback){
    pr.buildAll(fileData, function(err, pass){
        if(err){
            console.log(err);
            callback(WebsiteException(
                "HTTP 500 - Server Error",
                "A server error has occurred processing your request. Please try again later."
                ), 500);
            return;
        }
        callback(null, 200, pass);
    });
}
module.exports = {
    pageAccess: access,
    pageConfirm: confirm,
    pageBuild: build
}