const http = require('http');
const queryParser = require('querystring');
const urlParser = require('url');
let tasks = [];
const parseUrlQuery = (url) => queryParser.parse(urlParser.parse(url).query);

const parseUrlBody = (buffer) => JSON.parse(buffer);

const parseUrlPath = (url) => urlParser.parse(url).pathname.split('/').filter(subPath => subPath != '');



const handlePostRequest = (request, response) => {
	let data = '';
	request.on('data', (buffer) => {
		data += buffer;

	});
	request.on('end', () => {
		const body = parseUrlBody(data);
		try {
			const newTask = addTask(body);
			response.write(JSON.stringify(newTask));
			response.end();

		}
		catch (error) {
			response.writeHead(403, { 'content-type': 'application/json' });
			response.write(error.toString());
			response.end();

		}
	});

};
const handleGetRequest = (request, response, path) => {
	const task = path[1] !== undefined ? fetchTask(parseInt(path[1]), false) : fetchTask(undefined, true);
	response.write(JSON.stringify(task));
	response.end();
};

const handlePatchRequest = (request, response, path) => {
	const query = parseUrlQuery(request.url);
	updateTask(parseInt(path[1]), query);
	response.write('Task Updated');
	response.end();

};

const handleDeleteRequest = (request, response, path) => {

	deleteTask(parseInt(path[1]), path[1] === 'completed' ? true : undefined);

	response.write('Task(s) Deleted');
	response.end();
};



const addTask = (taskInfo) => {
	if (!taskInfo['name']) throw new Error('Missing Task name');
	tasks.push({
		id: tasks.length+1,
		name: taskInfo['name'],
		isCompleted: false,
	});
	return tasks[tasks.length - 1];
};

const fetchTask = (id, allTasks) => {
	if (allTasks) return tasks;
	if (typeof (id) !== 'number') throw new Error('Invalid ID');
	const task = tasks.filter(task => task.id === id);
	if (task.length == 0) throw new Error('Task Not Found');
	return task[0];
};

const updateTaskIds = () => tasks.forEach((element, index) => tasks[index].id = index+1);

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

const updateTask = (id, dataToBeUpdated) => {


	if (!id || typeof id !== 'number') {
		throw new Error('Invalid ID Type');
	}
	const indexOfTask = tasks.findIndex(task => task.id === id);
	if (indexOfTask === -1) throw new Error('Task not found');

	if (dataToBeUpdated['isCompleted']) {
		tasks[indexOfTask].isCompleted = Boolean(dataToBeUpdated['isCompleted']);

	}
	return true;

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





http.createServer((request, response) => {
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
					currentApiCall[0].handler(request, response, path);
					return;
				}


			}

		}
		response.end('Hello World');
	}

	catch (error) {

		response.writeHead(403, { 'content-type': 'application/json' });
		response.write(error.toString());
		response.end();
	}






}
).listen(3000).on('listening', () => console.log('Server Started Successfully'));

