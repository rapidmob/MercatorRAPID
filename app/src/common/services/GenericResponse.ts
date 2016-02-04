interface Response {
	response: GenericResponse;
}

interface GenericResponse {
	status: string;
	links: any;
	data: any;
	errors: any;
}