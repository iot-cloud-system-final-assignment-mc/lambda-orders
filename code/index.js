const AWS = require('aws-sdk');
const { buildResponse } = require('/opt/http-builder');


module.exports.getOrders = async (event, context) => {
    try {
        const username = event.requestContext.authorizer.username;
        const isAdmin = (event.requestContext.authorizer.isAdmin === "true");
        const dynamoDb = new AWS.DynamoDB.DocumentClient();

        const params = {
            TableName: 'Orders'
        };

        if (!isAdmin) {
            params.FilterExpression = 'username = :username';
            params.ExpressionAttributeValues = { ':username': username };
        }
        const result = await dynamoDb.scan(params).promise();
        return buildResponse(200, result["Items"]);
    } catch (error) {
        console.log(error);
        return buildResponse(500, error.message);
    }
}
// END

module.exports.upsertOrder = async (event, context) => {
    try {
        const dynamoDb = new AWS.DynamoDB.DocumentClient();
        const username = event.requestContext.authorizer.username;
        const isAdmin = (event.requestContext.authorizer.isAdmin === "true");

        const body = JSON.parse(event["body"]);
        const product = await dynamoDb.get({
            TableName: "Products",
            Key: {
                product_id: body.product_id
            }
        }).promise();

        const { v4: uuidv4 } = require('uuid');
        const id = body.order_id || uuidv4();
        const updated_at = Date.now();
        const params = {
            TableName: 'Orders',
            Key: {
                order_id: id
            },
            UpdateExpression: 'set #username = :username, #product_id = :product_id, #quantity = :quantity, #status = :status, #total_price = :total_price, #updated_at = :updated_at',
            ExpressionAttributeNames: {
                '#username': 'username',
                '#product_id': 'product_id',
                '#quantity': 'quantity',
                '#status': 'status',
                '#total_price': 'total_price',
                '#updated_at': 'updated_at'
            },
            ExpressionAttributeValues: {
                ':username': isAdmin ? body.username : username,
                ':product_id': body.product_id,
                ':quantity': body.quantity,
                ':status': body.order_id ? body.status : 'pending',
                ':total_price': body.quantity * product.Item.price,
                ':updated_at': updated_at
            }
        };

        const result = await dynamoDb.update(params).promise();
        return buildResponse(200, result);
    } catch (error) {
        console.log(error);
        return buildResponse(500, error.message);
    };
}
// END

module.exports.deleteOrder = async (event, context) => {
    try {
        const dynamoDb = new AWS.DynamoDB.DocumentClient();
        const params = {
            TableName: 'Orders',
            Key: {
                order_id: event.pathParameters.order_id
            },
            ReturnValues: 'ALL_OLD'
        };
        const result = await dynamoDb.delete(params).promise();
        return buildResponse(200, result);
    } catch (error) {
        console.log(error);
        return buildResponse(500, error.message);
    }
}
    // END