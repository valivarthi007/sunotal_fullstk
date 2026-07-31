import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    
    bucket = event.get('bucket')
    key = event.get('key')
    
    if not bucket or not key:
        logger.error("Missing bucket or key parameter in event")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing bucket or key parameter'})
        }
    
    try:
        logger.info(f"Attempting to delete s3://{bucket}/{key}")
        s3.delete_object(Bucket=bucket, Key=key)
        logger.info(f"Successfully deleted s3://{bucket}/{key}")
        return {
            'statusCode': 200,
            'body': json.dumps({'message': f'Successfully deleted s3://{bucket}/{key}'})
        }
    except Exception as e:
        logger.error(f"Error deleting object from S3: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
