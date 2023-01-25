const http = require('http');
const queryParser = require('querystring');
const urlParser = require('url');
let tasks = [];
const parseUrlQuery = (url) => queryParser.parse(urlParser.parse(url).query);

const parseUrlBody = (buffer) => JSON.parse(buffer);

const parseUrlPath = (url) => urlParser.parse(url).pathname.split('/').filter(subPath => subPath != '');


/**
 * It returns a promise that resolves to the body of the request
 * @param request - The request object from the HTTP server.
 * @returns A promise that resolves to the body of the request.
 */
const getURLBody = (request) => {
	return new Promise((resolve, reject) => {
		let data = '';

		request.on('data', (buffer) => {
			data += buffer;

		});
		request.on('end', () => {
			const body = parseUrlBody(data);
			resolve(body);
		});
		request.on('error', (error) => {
			reject(error.toString());
		});

	});
};



async function handlePostRequest(request, response) {

	const body = await getURLBody(request);
	const newTask = addTask(body);
	response.write(JSON.stringify(newTask));
	response.end();


}
const handleGetRequest = (request, response, path) => {
	const task = path[1] !== undefined ? fetchTask(parseInt(path[1]), false) : fetchTask(undefined, true);
	response.write(JSON.stringify(task));
	response.end();
};

const handlePatchRequest = (request, response, path) => {
	const query = parseUrlQuery(request.url);
	const task = updateTask(parseInt(path[1]), query);
	response.write(JSON.stringify(task));
	response.end();

};

const handleDeleteRequest = (request, response, path) => {

	deleteTask(parseInt(path[1]), path[1] === 'completed' ? true : undefined);

	response.write('Task(s) Deleted');
	response.end();
};



/**
 * It takes a taskInfo object, checks if it has a name property, and if it does, it adds it to the
 * tasks array
 * @param taskInfo - This is the object that contains the task name.
 * @returns The last element of the tasks array.
 */
const addTask = (taskInfo) => {
	if (!taskInfo['name']) throw new Error('Missing Task Key');
	if (taskInfo['name'].toString().length == 0) throw new Error('Task name missing');
	tasks.push({
		id: tasks.length + 1,
		name: taskInfo['name'],
		isCompleted: false,
	});
	return tasks[tasks.length - 1];
};

/**
 * "If allTasks is true, return all tasks, otherwise, if id is a number, return the task with that id,
 * otherwise throw an error."
 * 
 * The function is a little more complicated than that, but that's the gist of it
 * @param id - The ID of the task to fetch.
 * @param allTasks - A boolean value that indicates whether to return all tasks or just one task.
 * @returns the task with the id that was passed in.
 */
const fetchTask = (id, allTasks) => {
	if (allTasks) return tasks;
	if (typeof (id) !== 'number') throw new Error('Invalid ID');
	const task = tasks.filter(task => task.id === id);
	if (task.length == 0) throw new Error('Task Not Found');
	return task[0];
};

/**
 * It loops through the tasks array and updates the id of each task to be the index of the task plus
 * one
 */
const updateTaskIds = () => tasks.forEach((element, index) => tasks[index].id = index + 1);


/**
 * It deletes a task from the tasks array
 * @param id - The ID of the task to delete.
 * @param deleteCompletedTasks - boolean
 * @returns A boolean value
 */

const deleteTask = (id, deleteCompletedTasks) => {
	if (deleteCompletedTasks) {
		tasks = tasks.filter(task => task.isCompleted === false);
		updateTaskIds();

		return true;
	}


	if (!id || typeof id !== 'number') {
		throw new Error('Invalid ID Type');
	}



	const indexOfTask = tasks.findIndex(task => task.id === id);
	if (indexOfTask === -1) throw new Error('Invalid Task ID Provided');
	tasks.splice(indexOfTask, 1);
	updateTaskIds();
	return true;

};

/**
 * It takes an id and an object of data to be updated, and returns true if the task is updated
 * successfully
 * @param id - The id of the task to be updated.
 * @param dataToBeUpdated - This is an object that contains the data that needs to be updated.
 * @returns task as the index
 */

const updateTask = (id, dataToBeUpdated) => {


	if (!id || typeof id !== 'number') {
		throw new Error('Invalid ID Type');
	}
	const indexOfTask = tasks.findIndex(task => task.id === id);
	if (indexOfTask === -1) throw new Error('Task not found');

	if (dataToBeUpdated['isCompleted']) {
		tasks[indexOfTask].isCompleted = Boolean(dataToBeUpdated['isCompleted']);

	}
	return tasks[indexOfTask];

};



const apiObj = {
	'tasks': [
		{
			method: 'POST',
			handler: handlePostRequest
		},
		{
			method: 'GET',
			handler: handleGetRequest
		},

	],
	'task': [
		{
			method: 'PATCH',
			handler: handlePatchRequest
		},
		{
			method: 'DELETE',
			handler: handleDeleteRequest
		}
	]
};




/* Creating a server and listening to port 3000. */

http.createServer(async (request, response) => {
	try {
		const path = parseUrlPath(request.url);
		const pathsAvailable = Object.keys(apiObj);
		for (const key of pathsAvailable) {
			if (key === path[0]) {
				const currentApiCall = apiObj[key].filter(apiCall => apiCall.method === request.method);
				if (currentApiCall.length === 0) {
					response.writeHead(405, { 'content-type': 'application/json' });
					response.write('Invalid Method');
					response.end();
					return;
				}
				else {
					response.writeHead(200, { 'content-type': 'application/json' });
					await currentApiCall[0].handler(request, response, path);
					return;
				}


			}

		}
		response.end('Welcome to TODO App API');
	}

	catch (error) {

		response.writeHead(403, { 'content-type': 'application/json' });
		response.write(error.toString());
		response.end();
	}



}
).listen(3000).on('listening', () => console.log('Server Started Successfully'));

