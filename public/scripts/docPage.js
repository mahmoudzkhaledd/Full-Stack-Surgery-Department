let fullName= document.getElementById('Full-Name');
let speciality= document.getElementById('speciality');
let img = document.getElementById('profile-image');

let profile_box = document.getElementById('profile_box');

let url = window.location.href.split('/');
let profile_buttom = document.getElementById('profile_bottom');
let bottom_container = document.getElementById('bottom_container');

let button = document.getElementById('showmore');
button.addEventListener('click',(e)=>{
    let height =  profile_buttom.style.height;
    let width =  profile_box.style.width;
    let max_height = '720px';
    let min_height = '120px';

    let max_width = '600px';
    let min_width = '382.703px';
    
    bottom_container.style.display = width == max_width ? "none" : "initial";
    button.innerHTML = width == max_width ? "Show More" : "Show Less";
    profile_box.style.width = width == max_width ? min_width : max_width;

    profile_buttom.style.height = height == max_height?min_height:max_height;
});
let profile_image =  document.getElementById('profile-image');

async function getData(){
    let splittedUrl = `/${url[url.length -1]}`;
    const options = {
        headers: new Headers({ 'Content-Type': 'application/json' }),
        method: 'GET'
    }
    fetch(splittedUrl, options)
        .then(function(response){return response.json();})
        .then((n) => {
            console.log(n);
        }
    );
}
