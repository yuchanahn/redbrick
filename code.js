///////////////// CONFIG////////////////////////////////////////////
let IS_PUBLISHED = true;
const MAX_PLAYER = 4;
const START_ZOMBIE = false;

const START_TIMER = 200;

const ZOMBIE_SKILL_COOLTIME = 30;
const ZOMBIE_SKILL_DURATION = 5;

const SURVIVOR_SKILL_COOLTIME = 15;
const SURVIVOR_SKILL_DURATION = 5;

const ITEM_REGEN_SPEED = 10;

const elevator_dy = 60;
const elevator_speed = 10;

//////////////////////////// Key Input ////////////////////////////
const KEY_DASH = "KeyX";
const KEY_SKILL = "KeyC";

////////////////////////////////////////////////////////////////////
//                          #  Math  #                          ////
////////////////////////////////////////////////////////////////////

const max = (a, b) => {
    return a > b ? a : b;
};

const normalize = (vec) => {
    const norm = sqrt((vec.x * vec.x) + (vec.y * vec.y));
	return { x : (vec.x / norm), y : (vec.y / norm) };
};

const normalize3d = (vec) => {
    const norm = sqrt((vec.x * vec.x) + (vec.y * vec.y) + (vec.z * vec.z));
	return { x : (vec.x / norm), y : (vec.y / norm), z : (vec.z / norm) };
};

const minus = (vec1, vec2) => {
    return { x : (vec1.x - vec2.x), y : (vec1.y - vec2.y) };
};

const minus3d = (vec1, vec2) => {
    return { x : (vec1.x - vec2.x), y : (vec1.y - vec2.y), z : (vec1.z - vec2.z) };
};

const to_vec2 = (o) => {
    return { x : o.x, y : o.z };
};

const get_distance = (a, b) => {
    return sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + (a.z - b.z) * (a.z - b.z));
};


////////////////////////////////////////////////////////////////////
////////////////////////////// FUNC ////////////////////////////////

const yc_filter = (array, func) => {
    const result = [];
    for (let i = 0; i < array.length; i++) {
        func(array[i], i, array) ? result.push(array[i]) : null;
    }
    return result;
};

function isEmpty(str){
		
    if(typeof str == "undefined" || str == null || str == "")
        return true;
    else
        return false ;
}

var time_events = [];

const yc_timeEvent = (time, func) => {
    time_events.push({ t : time, func : func });
}

const unscaledDeltaTime = 0.01;
onSecond(unscaledDeltaTime, function() {
    time_events.forEach(x=>x.t-=unscaledDeltaTime);
    const ev = yc_filter(time_events, x=>x.t <= 0);
    ev.forEach(x=>x.func());
    time_events = yc_filter(time_events, x=>x.t > 0);
});

////////////////////////////////////////////////////////////////////
//                          #  Server  #                          //
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

/////////////////// Player Setting //////////////////////////////////

const AllPlayers = [];
const PC = {};

////////////////////////////////////////////////////////////////////

//////////////////// Item Setting //////////////////////////////////


const in_game_items = [
    "Item0",
    "Item1", 
    "Item2", 
    "Item3" 
];

const Elevators = ["Elevator0", "Elevator1"];

const Points = [ getObject("ZombieStartPoint").getPosition(),
                 getObject("PlayerStartPoint").getPosition(),
                 getObject("LandMark").getPosition() ];

const zombie_start_point   = Points[0];
const survivor_start_point = Points[1];
const land_mark_postion    = Points[2];

////////////////////////////////////////////////////////////////////


////////////////////// Dash ////////////////////////////////////////

const fixed_delta_time = 0.05; 
const dash_cooltime = 1;
const dash_power = 100;
const dash_time = 0.5;

////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////
//                          #    GUI   #                          //
////////////////////////////////////////////////////////////////////
const GUI_Dash = "GUI_Dash";
const GUI_SurvivorSkill = "GUI_SurvivorSkill";
const GUI_ZombieSkill = "GUI_ZombieSkill";

const GUI_SKILL_TEXT = "GUI_SKILL_TEXT";
const GUI_IMG_Survivor = "GUI_IMG_Survivor";

const GUI_HasItems = ["GUI_HasItem0" , "GUI_HasItem1" , "GUI_HasItem2" , "GUI_HasItem3"];
const GUI_WIN = "GUI_WIN";
const GUI_LOSE = "GUI_LOSE";

const GUI_Restart = "GUI_Restart";

const GUI_Quest = "GUI_Quest";
const GUI_Debug_Panel = "GUI_Debug_Panel";

const GUI_MainMenu = "GUI_MainMenu";
const GUI_MainMenuBtn = "GUI_MainMenuBtn";

const GUI_Timer = "GUI_Timer";

////////////////////////////////////////////////////////////////////
//                          #  World Object  #                    //
////////////////////////////////////////////////////////////////////

const ZombiePointer = "ZombiePointer";
const player_cnt = 0;
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

const Elevator_Off = [];

//////////////////// Key Bind //////////////////////////////////////
if(IS_PUBLISHED){
    onKeyDown(KEY_DASH, player => {
        PC[player.title].OnKeyPress(KEY_DASH); 
    });
    onKeyDown(KEY_SKILL, player => {
        PC[player.title].OnKeyPress(KEY_SKILL); 
    });
}

function Setup() {
}

function OnJoinPlayer(player) {
    AllPlayers.push(player);
    getObject(GUI_Debug_Panel).setText(player.title);

    const player_id = player.title;

    PC[player_id] = {
        // Player 객체
        obj : player,
        id : player_id,
        IsSurvivor : AllPlayers.length % 2 == (START_ZOMBIE ? 0 : 1),
        client_code : AllPlayers.length,
        hasItem : [false, false, false, false],
        move_vel : { x : 0, y : 0 },
        vel : { x : 0, y : 0 },
        prev_pos : { x : 0, y : 0 },
        dash_cooltime_timer : 0,
        y_point : 0,
        win_point : 0,

        // skill....
        slow_skill_timer : 0,
        speed_skill_timer : 0,
        skill_cool_time : 0,
        
        timer : START_TIMER,
        is_game_started : false,
        ui : {target : [player]},
        CalcVelocity : function() {
            const cur_pos = { x : this.obj.getPosition().x, y : this.obj.getPosition().z };
            let vel = normalize(minus(cur_pos, this.prev_pos));
            if(isNaN(vel.x)) { vel.x = 0; }
            if(isNaN(vel.y)) { vel.y = 0; }
            if(vel.x != 0 || vel.y != 0) {
                this.vel.x = vel.x;
                this.vel.y = vel.y;
            }
            this.prev_pos.x = cur_pos.x;
            this.prev_pos.y = cur_pos.y;
        },
        ItemInit : function() {
            this.hasItem = [false, false, false, false];
        },
        GoToStartPoint : function() {
            const pos = this.IsSurvivor ? survivor_start_point : zombie_start_point;
            this.obj.goTo(pos.x, pos.y + 5, pos.z);
        },
        UISetup : function() {
            // onClick 되야하는 GUI들은 따로 추가 함.
            for(let i = 1; i <= MAX_PLAYER; ++i) {
                getObject(GUI_WIN + i).hide(this.ui);
                getObject(GUI_LOSE + i).hide(this.ui);
                getObject(GUI_MainMenu + i).hide(this.ui);
            }
        },
        UIClear : function(func) {
            getObject(GUI_Timer).hide(this.ui);
            getObject(GUI_WIN + this.client_code).hide(this.ui);
            getObject(GUI_LOSE + this.client_code).hide(this.ui);
            getObject(GUI_Quest).hide(this.ui);
            getObject(GUI_Restart).hide(this.ui);
            //getObject(GUI_Dash).hide(this.ui);
            getObject(GUI_SurvivorSkill).hide(this.ui);
            getObject(GUI_ZombieSkill).hide(this.ui);
            getObject(GUI_MainMenu + this.client_code).hide(this.ui);
            getObject(GUI_MainMenuBtn).hide(this.ui);
            getObject(GUI_IMG_Survivor).hide(this.ui);
            getObject(GUI_Debug_Panel).hide(this.ui);

            getObject(GUI_Quest).setText("", this.ui);
            getObject(GUI_SKILL_TEXT).setText("", this.ui);
            getObject(GUI_Timer).setText("", this.ui);
            
            getObject(GUI_Debug_Panel).setText("", this.ui);

            GUI_HasItems.forEach(x=>getObject(x).hide(this.ui));

            if(!isEmpty(func)) func();
        },
        UIView : function(type) {
            if(type == "Item") {
                this.hasItem.forEach((x, i) => {
                    if(x) getObject(GUI_HasItems[i]).show(this.ui);
                });
                return;
            }

            this.UIClear(()=>{
                if(type == "GameStart") {
                    getObject(GUI_MainMenu + this.client_code).show(this.ui);
                    getObject(GUI_MainMenuBtn).show(this.ui);
                } 
                if(type == "SurvivorInGame") {
                    getObject(GUI_Timer).show(this.ui);
                    getObject(GUI_Quest).show(this.ui);
                    //getObject(GUI_Dash).show(this.ui);
                    getObject(GUI_SurvivorSkill).show(this.ui);
                    getObject(GUI_IMG_Survivor).show(this.ui);

                    getObject(GUI_Quest).setText(
                        (this.IsSurvivor ? "좀비를 피해 4개의 아이템을\n모아서 승리지점에 가자!" 
                                         : "플레이어 2명을 잡으세요!"), this.ui);
                } 
                if(type == "ZombieInGame") {
                    getObject(GUI_ZombieSkill).show(this.ui);
                    getObject(GUI_Quest).show(this.ui);

                    getObject(GUI_Quest).setText(
                        (this.IsSurvivor ? "좀비를 피해 4개의 아이템을\n모아서 승리지점에 가자!" 
                                         : "플레이어 2명을 잡으세요!"), this.ui);
                } 
                if(type == "Win") {
                    getObject(GUI_WIN + this.client_code).show(this.ui);
                    getObject(GUI_Restart).show(this.ui);
                }
                if(type == "Lose") {
                    getObject(GUI_LOSE + this.client_code).show(this.ui);
                    getObject(GUI_Restart).show(this.ui);
                }
            });

            if(type == "GameStart"){
                getObject(GUI_MainMenu + this.client_code).show(this.ui);
                getObject(GUI_MainMenu + this.client_code).onClick(()=> {
                    this.UIView(this.IsSurvivor ? "SurvivorInGame" : "ZombieInGame");
                    this.OnGameStart();
                    this.GoToStartPoint();
                },this.ui);
            }

            if(type == "Win") {
                getObject(GUI_WIN + this.client_code).onClick(()=> {
                    this.PlayerInit();
                },this.ui);
            } 
            if(type == "Lose") {
                getObject(GUI_LOSE + this.client_code).onClick(()=> {
                    this.PlayerInit();
                },this.ui);
            }
        },
        PlayerInit : function() {
            this.UIView("GameStart");
            this.ItemInit();
            this.GoToStartPoint();
        },
        OnGameStart : function() {
            this.is_game_started = true;
            this.timer = START_TIMER;
            this.skill_cool_time = this.IsSurvivor ? 0 : 0;
            if(this.IsSurvivor) getObject(GUI_Timer).setText(this.timer, this.ui);
        },
        OnPlayerCenncet : function() {
            console.log("on player connect : id [" + this.id + "]");
            this.PlayerInit();
        },
        OnPlayerColied : function(tag, obj, id) {
            if(tag == "player") {
                obj.OnGameOver();
            }

            if(tag == "elevator") {
                let isOff = false;
                for(let i = 0; i < Elevator_Off.length; i++){
                    if(obj == Elevator_Off[i]) isOff = true;
                }
                if(!isOff) {
                    yc_timeEvent(10, function() {
                        obj.moveY(-elevator_dy, elevator_speed);
                        Elevator_Off = yc_filter(Elevator_Off, y=>y != obj);
                    });
                    obj.moveY(elevator_dy, elevator_speed);
                    Elevator_Off.push(obj);
                }
            }

            if(tag == "item") {
                if(!this.IsSurvivor) return;
                if(this.hasItem[id]) return;

                obj.kill();
                yc_timeEvent(ITEM_REGEN_SPEED, function() { obj.revive(); });
                
                this.hasItem[id] = true;
                this.UIView("Item");
            }
        },
        FixedUpdate : function(fixed_delta_time) {
            if(!this.is_game_started) return;
            this.skill_cool_time -= fixed_delta_time;
            // 플레이어
            if(this.IsSurvivor) {
                // 콜라이더 없어서 거리 체크 
                
                in_game_items.forEach(x=>{
                    if(get_distance(getObject(x).getPosition(), this.obj.getPosition()) < 2) {
                        this.OnPlayerColied("item", getObject(x), in_game_items.indexOf(x));
                    }
                });

                this.timer -= fixed_delta_time;
                if(this.timer <= 0 ){
                    this.OnTimeOver();
                }
                getObject(GUI_Timer).setText("\n" + floor(this.timer), this.ui);

                // 좀비와 충돌처리.
                AllPlayers.forEach(x=> {
                    if(!IS_PUBLISHED) return;
                    if(PC[x.title].IsSurvivor) return;

                    const r = get_distance(x.getPosition(), this.obj.getPosition());
                    if(r < 1) {
                        PC[x.title].win_point++;
                        if(PC[x.title].win_point > 1) {
                            PC[x.title].OnGameWin();
                        }
                        this.OnGameLose();
                    }
                });

                // 승리 조건 판별
                if((get_distance(land_mark_postion, this.obj.getPosition()) < 5)
                && this.hasItem[0]
                && this.hasItem[1]
                && this.hasItem[2]
                && this.hasItem[3]) {
                    this.OnGameWin();
                }

                this.dash_cooltime_timer-=fixed_delta_time;

                if(this.dash_cooltime_timer > 0)
                {
                    //getObject(GUI_Dash).setText(floor(this.dash_cooltime_timer + 1), this.ui);
                } else {
                    //getObject(GUI_Dash).setText("", this.ui);
                }


                this.CalcVelocity();
                
                if((dash_cooltime - this.dash_cooltime_timer) > dash_time) {
                    this.player_dash = false;
                }
                if(this.player_dash) {
                    const mx = this.obj.getPosition().x + this.move_vel.x * dash_power * fixed_delta_time;
                    const mz = this.obj.getPosition().z + this.move_vel.y * dash_power * fixed_delta_time;
                    const my = this.y_point + 0.5;
                    this.obj.goTo(mx,my,mz);
                }

                if(this.skill_cool_time > 0)
                {
                    getObject(GUI_SurvivorSkill).setText(floor(this.skill_cool_time + 1), this.ui);
                } else {
                    getObject(GUI_SurvivorSkill).setText("", this.ui);
                }

                
            } else { 
                if(this.skill_cool_time > 0)
                {
                    getObject(GUI_ZombieSkill).setText(floor(this.skill_cool_time + 1), this.ui);
                } else {
                    getObject(GUI_ZombieSkill).setText("", this.ui);
                }

                // 좀비 빨라짐 스킬 처리.
                if(this.speed_skill_timer > 0) {
                    const t = floor(this.speed_skill_timer + 1);
                    getObject(GUI_SKILL_TEXT).setText(t, this.ui);
                    this.speed_skill_timer -= fixed_delta_time;
                    if(this.speed_skill_timer <= 0) {
                        this.obj.changePlayerSpeed(1);
                    }
                } else {
                    getObject(GUI_SKILL_TEXT).setText(this.slow_skill_timer > 0 ? "느려짐" : "", this.ui);
                }
                // 우선순위 판별?
                // 좀비 느려짐 스킬 처리.
                if(this.slow_skill_timer > 0) {
                    
                    this.slow_skill_timer -= fixed_delta_time;
                    if(this.slow_skill_timer <= 0) this.obj.changePlayerSpeed(1);
                }

                //////////////////////// Zombie //////////////////////////
                // 포인터 세팅.
                // 로테이션 값을 줘서 플레이어를 가르키는 화살표 메시를 구현하자.

                getObject(ZombiePointer + ((AllPlayers.indexOf(this.obj) + (START_ZOMBIE ? 2 : 1)) / 2)).goTo(
                    this.obj.getPosition().x,
                    this.obj.getPosition().y + 3,
                    this.obj.getPosition().z);
            }
        },
        OnKeyPress : function(key) {
            getObject(GUI_Debug_Panel).setText("[" + this.id + "] KeyPress : " + key, this.ui);
            //if(key == KEY_DASH) {
            //    if(this.dash_cooltime_timer > 0) return;
            //    this.move_vel = this.vel;
            //    this.dash_cooltime_timer = dash_cooltime;
            //    this.player_dash = true;
            //    this.y_point = this.obj.getPosition().y;
            //}

            if(key == KEY_SKILL) {
                if(this.skill_cool_time > 0) return;
                if(this.IsSurvivor) {
                    
                    this.skill_cool_time = SURVIVOR_SKILL_COOLTIME;

                    AllPlayers.forEach(function(x) {
                        const target = PC[x.title];
                        if(target.IsSurvivor) return;
                        target.slow_skill_timer = SURVIVOR_SKILL_DURATION;
                        target.obj.changePlayerSpeed(0.1);
                    });

                    getObject(GUI_SKILL_TEXT).setText("적 느려짐!", this.ui);
                    
                    yc_timeEvent(SURVIVOR_SKILL_DURATION, function() {
                        getObject(GUI_SKILL_TEXT).setText("", this.ui);
                    });
                }
                else {
                    this.obj.changePlayerSpeed(3);
                    this.skill_cool_time = ZOMBIE_SKILL_COOLTIME;
                    this.speed_skill_timer = ZOMBIE_SKILL_DURATION;
                }
            }
        },
        OnTimeOver : function() {
            if(this.IsSurvivor) this.OnGameLose();
        },
        OnGameLose : function() {
            this.is_game_started = false;
            this.UIView("Lose");
        },
        OnGameWin : function() {
            this.is_game_started = false;
            this.UIView("Win");
        },
    };



    Elevators.forEach(x=>
        PC[player_id].obj.onCollide(x, () => {
            PC[player_id].OnPlayerColied("elevator", getObject(x));
        }));

    ////////////////////// pysic ////////////////////////
    onSecond(fixed_delta_time, function() {
        PC[player_id].FixedUpdate(fixed_delta_time);
    });
    //////////////////////////////////////////////////////

    PC[player_id].UISetup();
    PC[player_id].OnPlayerCenncet();

    ////////////////////// Local Setting ///////////////////////
    if(!IS_PUBLISHED){
        onKeyDown(KEY_DASH, () => {
            PC[player_id].OnKeyPress(KEY_DASH);
        });
        onKeyDown(KEY_SKILL,()=>PC[player_id].OnKeyPress(KEY_SKILL));

        onSecond(unscaledDeltaTime, function() {
            time_events.forEach(x=>x.t-=unscaledDeltaTime);
            const ev = yc_filter(time_events, x=>x.t <= 0);
            ev.forEach(x=>x.func());
            time_events = yc_filter(time_events, x=>x.t > 0);
        });
    }  
    ////////////////////////////////////////////////////////////
}