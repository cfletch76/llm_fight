const { LLama } = require('llama-node');
const { LLamaWebAPI } = require('llama-node/web');

const llama = new LLama(LLamaWebAPI);

const downloadModel = async () => {
  await llama.load({
    modelPath: './models/llama-3.2-11b-vision-instruct',
    apiKey: process.env.LLAMA_API_KEY,
    url: 'https://llama3-2-multimodal.llamameta.net/*?Policy=eyJTdGF0ZW1lbnQiOlt7InVuaXF1ZV9oYXNoIjoibXllN3U4NnhuMjR4aXk2MjlyczM0NGZ2IiwiUmVzb3VyY2UiOiJodHRwczpcL1wvbGxhbWEzLTItbXVsdGltb2RhbC5sbGFtYW1ldGEubmV0XC8qIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzMwMzI4NTg0fX19XX0_&Signature=iBKioIPTDR7yY8cNzoYgyrEnsu0tY%7Efnpcap-IEy9FRgmDmSh-c3GcKbR-79%7EqAVsBGEnt4WgxbKmx%7EK8C%7EuMK4lKpimMw0Avc97fbdBvvk9qck5lngu%7EsMNEdd-BB1IoPhh3VnmsYLjcxetWlDfLTLMrdGw3QWHiF-IX6WHDriWm8h22Z5OibXyauGqhF94gjIWo3vNuDbXxSZjqRAKa31LBXq6J69oFjbdRIa9rYDpdjkFiXw1RKM54cQlnre8SIXGJBGpD9ig7dytoM1QsMMHx360njKTkKLt6mLsyXk-SCCUOtEbYKRIhBGlm4Wdh8a5AI96U5m11inP7NbSeA__&Key-Pair-Id=K15QRJLYKIFSLZ&Download-Request-ID=1188851935532514'
  });
};

downloadModel().catch(console.error);
