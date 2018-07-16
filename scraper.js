const scrapeIt          = require("scrape-it"),
      fs                = require("fs"),
      dateFormat        = require("dateformat"),
      http              = require("http");

const WEBSITE_URL       = "http://www.shirts4mike.com",
      ENTRY_POINT_URL   = "http://www.shirts4mike.com/shirts.php",
      LOG_FILE_NAME     = "scraper-error.log";

const shirtsData        = [];


// Print error message in console and log file
function printError(error){

  console.error(error.message);
  console.log("A log of this run can be found in:");
  console.log(__dirname + `\\${LOG_FILE_NAME}`);

  var now = new Date();
  var timestamp = dateFormat(now, "ddd mmm dd yyyy hh:MM:ss Z");
  fs.appendFileSync(LOG_FILE_NAME,  `[${timestamp}] ${error.message}\n`);
}


// Check connection to website and launch scraper if connection is ok
function checkConnectionLaunchScraper(){
  try{
    var request = http.get(ENTRY_POINT_URL, response =>{
      if(response.statusCode === 200){;
        scrapeShirtUrls();        // launch scraper
      }else{
        const error = new Error(`Error connecting to ${ENTRY_POINT_URL} ${response.statusMessage} (${response.statusCode})`);
        printError(error);
      }
    });

    request.on('error',error => {
      const errorMessage = new Error(`Error connecting to hostname: ${error.host}. Please check hostname or connection`);
      printError(errorMessage)
    });

  }catch(error){
    printError(error)
  }
}


// list shirt details page urls in ENTRY_POINT_URL
// and launch scrapeShirtDetails
function scrapeShirtUrls(){
  var request = scrapeIt(ENTRY_POINT_URL, {
    shirtsHrefs: {
        listItem: ".products li",
        data: {
          href: {
              selector: "a",
              attr: "href"
          }
        }
      }
    }
  ).then(({ data, response }) => {
    if (response.statusCode === 200) {
      var hrefs = data.shirtsHrefs;
      scrapeShirtDetails(hrefs);
    }else{
      console.log(response);
    }
  })
}


//Scrape details for shirts and store data in csv file
function scrapeShirtDetails(hrefs){
  for (var i = 0; i < hrefs.length; i++) {                     // loop through all shirt urls found in website entry point
    var url = WEBSITE_URL+"/"+hrefs[i].href;
    scrapeIt(url,{                                             // scrape shirt details
      shirtData: {
          listItem: "#content .wrapper",
          data: {
            title: {
              selector: ".shirt-details h1"
            },
            price: {
              selector: ".shirt-details .price"
            },
            imageURL: {
              selector: ".shirt-picture img",
              attr: "src"
          }
        }
      }
    }).then(({ data, response }) => {
      var shirtUrl = WEBSITE_URL + hrefs[shirtsData.length].href;
      var shirt =  new Shirt(data.shirtData[0],shirtUrl);       // create shirt object with scraped data
      shirtsData.push(shirt);                                   // push shirt object in "shirtsData" global array

      if(hrefs.length===shirtsData.length){                     // write data in csv when all shirt objects are in "shirtsData"
        writeCsv(shirtsData);
      }
    });
  }
}

// Shirt object
function Shirt(shirtData,shirtUrl){
  var title = shirtData.title;
  this.title = title.substring(title.indexOf(" ") + 1);
  this.price = shirtData.price;
  this.imageURL = shirtData.imageURL;
  this.url = shirtUrl;
  this.time = dateFormat(Date.now(), "hh:MM:ss:l");
}

// helper function for writing all shirts data in csv file
function writeCsv(shirtsData){
  const createCsvWriter = require('csv-writer').createObjectCsvWriter;
  const pathCsvFile = `data\\${dateFormat(Date.now(), "yyyy-mm-d")}.csv`;

  // create csv file
  const csvWriter = createCsvWriter({
      path: pathCsvFile,
      header: [
          {id: 'title', title: 'Title'},
          {id: 'price', title: 'Price'},
          {id: 'imageURL', title: 'ImageURL'},
          {id: 'url', title: 'URL'},
          {id: 'time', title: 'Time'},
      ]
  });

  // write to csv file
  csvWriter.writeRecords(shirtsData).then(() => {
    console.log('...Done');
    console.log(`Please check this file: ${__dirname}\\${pathCsvFile}`);
  });
}




// create "data" directory if doesn't exist
var dir = './data';
if (!fs.existsSync(dir)) {
     fs.mkdirSync(dir);
}

// launch scraping process
checkConnectionLaunchScraper();
