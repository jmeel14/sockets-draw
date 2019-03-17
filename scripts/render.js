const hbars = require("handlebars");
const fs = require("fs");

function WebsiteException(excCode, excBody){
    return `<body><h1>${excCode}</h1><p>${excBody}</p>`;
}

function buildHead(pageData, callback){
    fs.readFile("./page_structures/head.html", function(err, pass){
        if(err){
            console.log(err);
            callback(WebsiteException(
                "500 - Internal Server Error",
                "A server error has occurred processing your request. Please try again later."
            ));
            return;
        }
        if(!pass.toString("utf-8").length > 0){
            callback(WebsiteException(
                "500 - Internal Server Error",
                "A server error has occurred processing your request. Please try again later."
            ));
            console.log("WARNING: Empty head HTML detected.");
            return;
        }
        let templatePrepared = hbars.compile(pass.toString("utf-8"));
        let scripts = [];
        if(Object.keys(pageData.scripts).length > 0){
            for(let script in pageData.scripts){
                let currScript = pageData.scripts[script];
                let scriptData = fs.readFileSync("./page_scripts/" + currScript);
                scripts.push(scriptData.toString("utf-8"));
            }
        }
        let styles = fs.readFileSync("./page_styles/" + pageData.style).toString("utf-8");
        let output = templatePrepared({
            title: pageData.title,
            styles: "<style>" + styles + "</style>",
            scripts: scripts
        });
        callback(null, output);
    });
}

function buildBody(pageData, callback){
    fs.readFile("./page_structures/" + pageData.htmlBody, function(err, bodyHtml){
        if(err){
            callback(WebsiteException(
                "500 - Internal Server Error",
                "A server error has occurred processing your request. Please try again later."
            ));
            console.log(err);
            return;
        }
        if(!bodyHtml.toString("utf-8").length > 0){
            callback(WebsiteException(
                "500 - Internal Server Error",
                "A server error has occurred processing your request. Please try again later."
            ));
            console.log("WARNING: Empty body HTML detected.");
            return;
        }
        fs.readFile("./page_structures/" + pageData.footer, function(err, bodyFooter){
            if(err){
                callback(WebsiteException(
                    "500 - Internal Server Error",
                    "A server error has occurred processing your request. Please try again later."
                ));
            }
            if(!bodyFooter.toString("utf-8").length > 0){
                callback("<body" + bodyHtml + "</body></html>");
            }
            callback(null, bodyHtml.toString("utf-8") + bodyFooter.toString("utf-8"));
        });
    });
}

function buildAll(pageData, callback){
    buildHead(pageData.head, function(err, headBuilt){
        if(err){
            callback(err);
            console.log(err);
            return;
        }
        buildBody(pageData.body, function(err, bodyBuilt){
            if(err){
                callback(err);
            }
            let complete = headBuilt + bodyBuilt
            callback(null, complete);
        });
    });

}

module.exports = {
    buildHead: buildHead,
    buildBody: buildBody,
    buildAll: buildAll
}