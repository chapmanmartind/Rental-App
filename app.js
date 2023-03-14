//Will be visible at http://localhost:8080/

import data from './datepicker-exercise-mock-db.json' assert { type: "json" };
import express from 'express';
const app = express();
const port = 8080;
app.use(express.static('public'));
app.use(express.json());

const addDays = (date, days) => {
    //Increments date by days

    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
const toYMDFormat = (day) => {
    //converts a date to the Year-Month-Day format

    var dateString = new Date(day.getTime()).toISOString().split("T")[0];
    //var dateString = new Date(day.getTime() - (day.getTimezoneOffset() * 60000 )).toISOString().split("T")[0];
    //The above offsets by timezone -> doesn't work
    return dateString;
}

const withinDates = (day, startDate, rentalPeriod) => {
    //Returns 1 if a day is between the start and the return date, 0 otherwise

    day = Date.parse(day);
    startDate = Date.parse(startDate);
    let endDate = addDays(startDate, rentalPeriod);
    
    return ((day >= startDate) && (day < endDate));
}

const avaliableDay = (data, ProductVariantId, numProduct, day, itemIdList) => {
    //Returns 1 if a product is avaliable on a given day, 0 otherwise
    
    let numProductCpy = numProduct;

    for (let i = 0; i < data.OrderLines.length; i++) {
        if ((itemIdList.includes(data.OrderLines[i].InventoryItemId)) && (withinDates(day, data.OrderLines[i].StartDate, data.OrderLines[i].RentalPeriodDays))) {
            numProductCpy --;
        }
    }

    return (numProductCpy > 0);
}

const unavaliableDays = (data, ProductVariantId) => {
    //returns a list of days that an item is unavaliable

    let numProduct = 0;
    let itemIdList = [];

    for (let i = 0; i < data.InventoryItems.length; i++) {
        if (data.InventoryItems[i].ProductVariantId == ProductVariantId) {
            numProduct++;
            itemIdList.push(data.InventoryItems[i].InventoryItemId)
        }
    }

    //Find the earliest rental date and the latest return date
    let absStartDate = Date.parse(data.OrderLines[0].StartDate);
    let absEndDate = addDays(data.OrderLines[0].StartDate, data.OrderLines[0].RentalPeriodDays);

    for (let i = 1; i < data.OrderLines.length; i++) {
        let currStartDate = Date.parse(data.OrderLines[i].StartDate);
        let currEndDate = addDays(data.OrderLines[i].StartDate, data.OrderLines[i].RentalPeriodDays);
        
        if (currStartDate < absStartDate) {
            absStartDate = currStartDate;
        }
        if (currEndDate > absEndDate) {
            absEndDate = currEndDate;
        }
    }

    //Iterates through days from earliest rental to final return
    let unavaliableList = []
    let day = absStartDate;

    while (day < absEndDate) {
        if (! avaliableDay(data, ProductVariantId, numProduct, day, itemIdList)) {
            unavaliableList.push(toYMDFormat(day));
        }
        day = addDays(day, 1);
    }

    return unavaliableList;
}

const returnDistinctItemNames = (inventoryItems) => {
    //Returns distinct item names from inventoryItems

    const names = [];
    for (let i = 0; i < inventoryItems.length; i++) {
        names.push(inventoryItems[i].ProductVariantId);
    }
    return [...new Set(names)];
}

app.get('/clothingOptions/:dynamic', (req, res) => {
    //Sends the possible clothing options to the frontend

    res.status(200).json(returnDistinctItemNames(data.InventoryItems));
})

app.get('/info/:dynamic', (req, res) => {
    //Sends a json of the unavaliable days to the frontend

    const {dynamic} = req.params;
    const {key} = req.query;
    res.status(200).json(unavaliableDays(data, key));
})

app.listen(port, ()=>console.log(`Server has started on port: ${port}`));