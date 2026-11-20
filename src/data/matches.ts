export type Match={id:number,league:string,flag:string,home:string,away:string,hs:number,as:number,min:string,status:'live'|'next'|'done',time?:string,events?:string[]};
export const matches:Match[]=[
{id:1,league:'LaLiga - España',flag:'🇪🇸',home:'Real Madrid',away:'Barcelona',hs:2,as:1,min:"67'",status:'live',events:["18' ⚽ Vinícius Jr. — Real Madrid","41' ⚽ Lewandowski — Barcelona","52' ⚽ Rodrygo — Real Madrid"]},
{id:2,league:'Serie A - Italia',flag:'🇮🇹',home:'Inter',away:'Milan',hs:1,as:0,min:"53'",status:'live',events:["39' ⚽ Lautaro — Inter"]},
{id:3,league:'Libertadores',flag:'🏆',home:'Flamengo',away:'River Plate',hs:0,as:0,min:"32'",status:'live'},
{id:4,league:'Liga 1 - Perú',flag:'🇵🇪',home:'Alianza Lima',away:'Universitario',hs:1,as:0,min:"45+2'",status:'live'},
{id:5,league:'Champions League',flag:'🏆',home:'Inter',away:'Arsenal',hs:0,as:0,min:'',status:'next',time:'Hoy · 15:00'},
{id:6,league:'Premier League',flag:'🏴',home:'Man. City',away:'Arsenal',hs:0,as:0,min:'',status:'next',time:'Mañana · 15:00'},
{id:7,league:'LaLiga - España',flag:'🇪🇸',home:'Atlético',away:'Sevilla',hs:0,as:0,min:'',status:'next',time:'Mañana · 17:30'},
{id:8,league:'Premier League',flag:'🏴',home:'Liverpool',away:'Chelsea',hs:2,as:1,min:'Final',status:'done'},
{id:9,league:'LaLiga - España',flag:'🇪🇸',home:'Betis',away:'Real Madrid',hs:0,as:3,min:'Final',status:'done'},
{id:10,league:'Liga 1 - Perú',flag:'🇵🇪',home:'Universitario',away:'Cristal',hs:1,as:1,min:'Final',status:'done'}];

export const leagues=[['🇪🇸','LaLiga - España'],['🏴','Premier League - Inglaterra'],['🇮🇹','Serie A - Italia'],['🇩🇪','Bundesliga - Alemania'],['🇫🇷','Ligue 1 - Francia'],['🇵🇪','Liga 1 - Perú'],['🏆','Copa Libertadores'],['⚽','Champions League'],['🏆','Europa League']];

